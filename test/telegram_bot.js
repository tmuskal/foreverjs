import {workflowFactory, Worker, workflow, WorkflowController, activity} from '../src';
import {WorkflowDecision,WorkflowDecisionScheduleWorkflow,WorkflowDecisionScheduleActivity,WorkflowNoDecision} from '../src/workflow_signals'
import journalService from '../src/journal/client';
import telegramInteractionsManager from '../src/helpers/telegram';
import schedulerClient from '../src/scheduler/client';

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
				return await this.removeTodo(choice);
			}			
		}
	}
	@activity()
	async removeTodo(todo){	
		todos = todos.filter(t=> t != todo);
		console.log("removed todo", todo);
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

class reminder extends WorkflowController{
	@workflow()
	async start({telegramUserId}){
		var when = await this.doHuman({
				prepare:this.prepareWhen,
				process:function (result){
					var dic = {
						'1m': 60,
						'5m': 300,
						'1h': 3600
					}
					return dic[result];				
				},
				id:'reminderWhen',
				payload:{telegramUserId}
			});
		var what = await this.doHuman({
				prepare:this.prepareNewReminder,
				process:function (result){
					return result;				
				},
				id:'reminderWhat',
				payload:{telegramUserId}
			});		
		if(when){
			await this.sleep(when);
			await this.remind({telegramUserId,text:what})
		}
	}
	@activity()
	async remind({telegramUserId,text}){		
		await telegramInteractionsManager.sendMessage(telegramUserId, "you asked to remind you: " + text);
	}
	@activity()
	async prepareNewReminder({telegramUserId},id){		
		var newInteraction = telegramInteractionsManager.newInteraction(telegramUserId,this.workflowId, id);
		newInteraction.sendMessage("enter text to remind you:");
	}		
	@activity()
	async prepareWhen({telegramUserId},id){
		var newInteraction = telegramInteractionsManager.newInteraction(telegramUserId,this.workflowId, id);
		var choices = {'1m':'1 Minute','5m':"5 Mintues","1h":"1 Hour"};

		newInteraction.sendMessage("to when", choices);
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
		await this.dispatchWf({telegramUserId,className:definitions.results})
		return 
		// var aa = await this.doX();
	}
	@activity()
	async dispatchWf({telegramUserId,className}){	
		schedulerClient.run({className,name:'start',args:[{telegramUserId}],id:'test12' + new Date().getTime()});		
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
workflowFactory.reminder = reminder;

import {server} from '../src/index';
server.startAll();

