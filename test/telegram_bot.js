import {workflowFactory, Worker, workflow, WorkflowController, activity} from '../src';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../src/workflow_signals'
import journalService from '../src/journal/client';
import telegramInteractionsManager from '../src/helpers/telegram';


class theWeather extends WorkflowController{
	@workflow()
	async start({telegramUserId}){
		await this.weather(telegramUserId);
	}
	@activity()
	async weather(telegramUserId){		
		await telegramInteractionsManager.sendMessage(telegramUserId, "the weather is good");
	}	
}
var todos = [];
var todoChoices = {"show":"Show TODO List","add":"Add TODO"};
class todosWf extends WorkflowController{
	@workflow()
	async start({telegramUserId}){
		var choice = await this.doHuman({
				prepare:this.prepare,
				process:function (result){
					return result;				
				},
				id:'todosSelect',
				payload:{telegramUserId}
			});
		if(choice){
			if(choice == 'new'){
				await this.doHuman({
								prepare:this.prepareNewTodo,
								process:this.processNewTodo,
								id:'newTodo',
								payload:{telegramUserId}
							});
			}
			else if(choice == 'done'){
				return;			
			}
			else{

			}			
		}
	}

	@activity()
	async processNewTodo(newTodo,id){	
		todos.push(newTodo);
		console.log("added new todo", newTodo);
	}	

	@activity()
	async prepareNewTodo({telegramUserId},id){		
		var newInteraction = telegramInteractionsManager.newInteraction(telegramUserId,this.workflowId, id);
		newInteraction.sendMessage("enter new todo:");
	}		
	@activity()
	async prepare({telegramUserId},id){
		var newInteraction = telegramInteractionsManager.newInteraction(telegramUserId,this.workflowId, id);
		var choices = {};
		todos.forEach(a=> choices[a] = a);
		choices.new = 'New TODO'
		choices.done = 'Done'

		newInteraction.sendMessage("click a todo to complete. or new todo, or done", choices);
	}	

}

class mainTelegram extends WorkflowController{
	@workflow()
	async start({telegramUserId,telegramText}){
		var definitions = {};
		var i = 0;
		while(!definitions.results){
			i++;
			definitions = await this.doHuman({
				prepare:this.prepare,
				process:this.process,
				id:'hello_' + i,
				payload:{telegramUserId,i}
			});
		}		
		var classFn = eval(definitions.results);
		var instance = new classFn(this.newDispatchID());
		return await instance.start({telegramUserId})
		// var aa = await this.doX();
	}
	@activity()
	async thankYou(telegramUserId){		
		await telegramInteractionsManager.sendMessage(telegramUserId, "thank you");
	}	
	@activity()
	async process(result,id){

		if(!Object.keys(workflowFactory).find(a=> result == a))
			return {
				error:"not found"
			}
		return {
			results: result
		}					
	}

	@activity()
	async prepare({telegramUserId,i},id){
		var newInteraction = telegramInteractionsManager.newInteraction(telegramUserId,this.workflowId, id);
		var choices = {};
		Object.keys(workflowFactory).forEach(a=> choices[a] = a);
		newInteraction.sendMessage("choose a workflow", choices);
	}	
}

workflowFactory.mainTelegram = mainTelegram;
workflowFactory.todosWf = todosWf;
workflowFactory.theWeather = theWeather;
import jobQueueServer from '../src/job_queue/server';
import journalServer from '../src/journal/server';
import schedulerServer from '../src/scheduler/server';
import worker from '../src/workers/server';
import schedulerClient from '../src/scheduler/client';
