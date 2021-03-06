import { WorkflowDecision, WorkflowDecisionScheduleWorkflow, WorkflowDecisionScheduleActivity, WorkflowNoDecision, WorkflowTimerDecision, WorkflowDecisionContinueAsNew, WorkflowDecisionMultipleDecisions } from '../workflow_signals'
import journalService from '../journal/client';
import logger from '../logger';
import cacheUtil from '../utils/cache.js';
const moment = require("moment");

function workflow(options) {
	options = options || {};
	let { version, cache } = options;
	if (!process.env.ENABLE_CACHE)
		cache = false;
	return function decorator(target, name, descriptor) {
		// console.log("workflow init", value,target, name);
		let { value, get } = descriptor;
		target.isWorkflow = true;
		return {
			get: function getter() {
				const newDescriptor = { configurable: true };

				// If we are dealing with a getter
				if (get) {
					// Replace the getter with the processed one

					// Redefine the property on the instance with the new descriptor
					Object.defineProperty(this, name, newDescriptor);

					// Return the getter result
					return newDescriptor.get();
				}
				const theFunc = async function() {
					// if main dispatch, mark main dispatch false and run		  	 
					if (this.mainRun) {

						this.mainRun = false;
						await this.journal.append({ type: "DecisionTaskStarted", date: new Date() });
						try {
							const theArgs = arguments;
							var fn = async() => await value.call(this, ...theArgs);
							var res = await (cache ? cacheUtil.getOrInvoke({ fn, key: { c: target.constructor.name.toString(), f: value.name.toString(), args: theArgs } }) : fn());
							await this.journal.append({ type: "DecisionTaskComplete", date: new Date() });
							var parent = (await this.journal.getEntries()).find(e => e.type === 'WorkflowStarted').parent;
							await this.journal.append({ type: "WorkflowComplete", date: new Date(), result: res, name: name, class: this.constructor.name, id: this.workflowId, parent });

							// notify scheduler
							await this.scheduler.taint();
						}
						catch (e) {
							async function handleDecision(e) {
								if (e instanceof WorkflowNoDecision) {
									// logger.debug("no decisions for " + this.workflowId);
								}
								if (e instanceof WorkflowDecisionScheduleActivity) {
									// add to journal
									await this.journal.append({ type: "ScheduleActivity", date: new Date(), dispatchId: e.dispatchId, args: e.args, name: e.name });
								}
								else if (e instanceof WorkflowDecisionScheduleWorkflow) {
									// add to journal
									await this.journal.append({ type: "ScheduleChildWorkflow", date: new Date(), dispatchId: e.dispatchId, args: e.args, name: e.name, class: e.class });
								}
								else if (e instanceof WorkflowTimerDecision) {
									await this.journal.append({ type: "TimerSetup", date: new Date(), timerId: e.timerId, duration: e.duration });
									await this.scheduler.scheduleTimer(e.duration, e.timerId);
								}
								else if (e instanceof WorkflowDecisionContinueAsNew) {
									await this.journal.append({ type: "ContinueAsNew", date: new Date(), args: e.args, name: name, class: this.constructor.name, dispatchId: this.workflowId + "_1" });
								}
								else if (e instanceof WorkflowDecisionMultipleDecisions) {
									if (e.decisions.filter(d => !(d instanceof WorkflowNoDecision)).length === 0) {
										// logger.debug("no decisions for multi " + this.workflowId);
									}
									return await Promise.all(e.decisions.map(decision => handleDecision.bind(this)(decision)));
								}
								else if (!(e instanceof WorkflowDecision)) {
									console.log('real error', e);
									// mark failed
									await this.journal.append({ type: "DecisionTaskFailed", date: new Date(), error: e });
									// await this.scheduler.taint();
									throw e;
								}
								return e;
								// statements to handle TypeError exceptions
							}
							// console.log(e);
							var res = await (handleDecision.bind(this)(e));
							if (e instanceof WorkflowDecision) {
								if (e instanceof WorkflowNoDecision) {
									// logger.debug("no decisions for " + this.workflowId);
								}
								// complete decision task
								await this.journal.append({ type: "DecisionTaskComplete", date: new Date() });
								// await this.scheduler.taint();

							}
							// notify scheduler		
							this.scheduler.taint();
							return res;
						}
					}
					else if (this.mainDispatch) {
						// from test and api gateway.
						this.mainDispatch = false;
						var state = await this.workflowStateFromHistory();
						if (state.finished) {
							return state.result;
						}
						if (state.failed) {
							throw state.result;
						}
						if (state.notFound) {
							await this.journal.append({ type: "WorkflowStarted", date: new Date(), args: arguments, name, class: this.constructor.name, parent: this.parentWorkflow });
							await this.scheduler.taint();
							throw new WorkflowNoDecision();
						}
						if (state.started) {
							throw new WorkflowNoDecision();
						}
						throw new WorkflowNoDecision();
						// convert to future
					}
					else if (this.innerDispatch) {
						// from test and api gateway.
						// write to journal
						// this.innerDispatch = false;
						var state = await this.workflowStateFromHistory();
						// console.log("state3",state);
						if (state.finished) {
							return state.result;
						}
						else if (state.failed) {
							throw state.result;
						}
						else if (state.notFound) {
							await this.journal.append({ type: "WorkflowStarted", date: new Date(), args: arguments, name, class: this.constructor.name, parent: this.parentWorkflow });
							await this.scheduler.taint();
							throw new WorkflowNoDecision();
						}
						else if (state.started) {
							throw new WorkflowNoDecision();
						}
						else if (state.queue) {
							throw new WorkflowNoDecision();
						}
						else {
							logger.warn("innerDispatch in unknown state ", state, this.workflowId);
							await this.scheduler.taint();
						}
					}
					else {
						// child workflow
						var dispatchId = this.newDispatchID(this.constructor.name + "." + name);
						var theJournal = journalService.getJournal(dispatchId);
						var entries = await theJournal.getEntries();
						var parent = entries.find(e => e.type === 'WorkflowStarted');
						if (parent) {
							parent = parent.parent;
							if (!parent) {
								logger.error("child workflow with no parent " + dispatchId)
								// throw new Error("child workflow with no parent " + dispatchId);
							}
						}
						else {
							// logger.warn("child workflow with no start " + dispatchId)
							// throw new Error("child workflow with start " + dispatchId);
						}

						var state = await this.workflowStateFromHistory(theJournal);
						// var state = await this.stateFromHistory(dispatchId, journalService.getJournal(parent));

						// console.log("state2",state, dispatchId,this.workflowId,parent);
						if (state.notFound) {
							throw new WorkflowDecisionScheduleWorkflow(dispatchId, name, arguments, this.constructor.name);
						}
						if (state.failed) {
							throw new WorkflowDecisionScheduleWorkflow(dispatchId, name, arguments, this.constructor.name);

							// throw state.result;
						}
						if (state.finished) {
							return state.result;
						}

						if (moment().diff(moment(state.last_activity).utc(), 'minutes') > 10) {
							logger.warn("WorkflowTimeout", this.workflowId);
							await theJournal.append({ type: "WorkflowTimeout", date: new Date(), dispatchId });
							throw new WorkflowDecisionScheduleWorkflow(dispatchId, name, arguments, this.constructor.name);
						}
						throw new WorkflowNoDecision();

						// else, find id in journal and see if need to redispatch or return existing result.
						// throw new Error("not implemented");
					}
				};
				// Process the function	      
				newDescriptor.value = theFunc.bind(this);
				// Redfine it on the instance with the new descriptor
				Object.defineProperty(this, name, newDescriptor);

				// Return the processed function
				return newDescriptor.value;
			}
		};

	}
}
export default workflow;
