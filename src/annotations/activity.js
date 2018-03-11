import { WorkflowDecision, WorkflowDecisionScheduleWorkflow, WorkflowDecisionScheduleActivity, WorkflowNoDecision } from '../workflow_signals'
const moment = require("moment");
import logger from '../logger';
import cacheUtil from '../utils/cache.js';
import blobUtil from '../utils/blob.js';

function activity(options) {
	options = options || {};
	let { version, cache, blob } = options;
	if (!process.env.ENABLE_BLOB || blob === undefined || blob === null || blob === false) {
		blob = { result: false, input: false }
	}
	else if (blob === true) {
		blob = { result: true, input: true }
	}
	if (!process.env.ENABLE_CACHE)
		cache = false;
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

						const inflateBlobArguments = blob.input ? async(argsArray) =>
							await Promise.all(Object.values(argsArray).map(async(arg) => {
								if (arg._blobKey)
									return blobUtil.getData({ key: arg._blobKey });
								if (Array.isArray(arg))
									return await Promise.all(arg.map(async(arg2) =>
										arg2._blobKey ? (await blobUtil.getData({ key: arg2._blobKey })) : arg2
									));
								if (typeof arg === 'object') {
									await Promise.all(Object.keys(arg).map(async(key) => {
										const arg2 = arg[key];
										const value = arg2._blobKey ? (await blobUtil.getData({ key: arg2._blobKey })) : arg2;
										arg[key] = value;
									}));
									return arg;
								}
								else
									return arg;
							})) : async(a) => a;

						const shrinkBlobResults = blob.result ? async(result) => {
							if (Array.isArray(result))
								return await Promise.all(result.map((arg) =>
									blobUtil.setData({ entry: arg })
								));
							if (typeof result === 'object') {
								await Promise.all(Object.keys(result).map(async(key) => {
									result[key] = await blobUtil.setData({ entry: result[key] })
								}));
								return result;
							}
							return await blobUtil.setData({ entry: result });
						} : async(a) => a;
						const theArgs = arguments;
						const fn = async() => {
							const inflatedArgs = await inflateBlobArguments(theArgs);
							// console.log("inflatedArgs", theArgs, inflatedArgs);
							return await shrinkBlobResults(await value.call(this, ...inflatedArgs))
						};
						return await (cache ? cacheUtil.getOrInvoke({ fn, key: { f: value.name.toString(), args: theArgs } }) : fn());
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
