import { WorkflowDecision, WorkflowDecisionScheduleWorkflow, WorkflowDecisionScheduleActivity, WorkflowNoDecision } from '../workflow_signals'
const moment = require("moment");
import logger from '../logger';
import cacheUtil from '../utils/cache.js';
import blobUtil from '../utils/blob.js';

function activity(options) {
	options = options || {};
	const { version, cache, blob } = options;

	return function decorator(target, name, descriptor) {
		let { value, get } = descriptor;
		target.isActivity = true;
		return {
			get: function getter() {
				const newDescriptor = { configurable: true };

				// If we are dealing with a getter
				if (get) {
					// Replace the getter with the processed one
					// newDescriptor.get = function(){
					// 	console.log("activity_getter inner",this);
					// 	return get();
					// };

					// Redefine the property on the instance with the new descriptor
					Object.defineProperty(this, name, newDescriptor);

					// Return the getter result
					return newDescriptor.get();
				}
				const theFunc = async function() {
					if (this.activityMode) {
						const enableBlob = blob;
						const inflateBlobArguments = enableBlob ? async(argsArray) => {
							return await Promise.all(Object.values(argsArray).map((arg) =>
								arg._blobKey ? blobUtil.getData({ key: arg._blobKey }) : arg
							))
						} : async(a) => a;
						const shrinkBlobResults = enableBlob ? async(result) => {
							if (Array.isArray(result))
								return await Promise.all(result.map((arg) =>
									blobUtil.setData({ entry: result })
								));
							if (typeof result === 'object') {
								await Promise.all(Object.keys(result).map((key) => {
									result[key] = blobUtil.setData({ entry: result[key] })
								}));
								return result;
							}
							return await blobUtil.setData({ entry: result });
						} : async(a) => a

						const fn = async() => await shrinkBlobResults(await value.call(this, ...(await inflateBlobArguments(arguments))));
						return await (cache ? cacheUtil.getOrInvoke({ fn, key: { f: value.constructor.name.toString(), args: arguments } }) : fn());
						// console.log("activity res",res,arguments);

						// write results in journal

					}
					else {
						// give a canonical id - workflowid + internal activity counter
						var dispatchId = this.newDispatchID(name);

						var state = await this.stateFromHistory(dispatchId);
						// logger.debug("state.started",state.started)
						if (state.finished) {
							return state.result;
						}
						if (state.notFound) {
							throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
						}
						if (state.failed) {
							// raise failed - let controller reschedule if needed.
							throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
						}
						if (state.timedOut) {
							// not used?
							throw new WorkflowDecisionScheduleActivity(dispatchId, name, arguments);
						}
						if (state.scheduled) {
							throw new WorkflowNoDecision();
						}
						if (state.started) {

							throw new WorkflowNoDecision();
						}
						if (state.queue) {
							throw new WorkflowNoDecision();
						}
						throw new WorkflowNoDecision();
					}

				};
				// Process the function
				newDescriptor.value = theFunc.bind(this);

				// Redfine it on the instance with the new descriptor
				Object.defineProperty(this, name, newDescriptor);

				// Return the processed function
				return newDescriptor.value
			}
		};

	}

}

export default activity;
