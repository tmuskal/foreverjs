const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});


import schedulerClient from '../scheduler/client';



class InteractionHandler{
  constructor(userId, workflowId, signalId, manager){
    this.userId = userId;
    this.signalId = signalId;
    this.workflowId = workflowId;
    this.manager = manager;
  }
  async triggerCallback(data){
    this.close();
    return await schedulerClient.getScheduler(this.workflowId).signal(this.signalId,data);
  }
  async sendMessage(text, choices){
   const opts = {      
    };
    if(choices){
      opts.reply_markup = {
        inline_keyboard: [
          Object.keys(choices).map(choice => {
            return {
              text: choices[choice],
               // we shall check for this value when we listen
               // for "callback_query"
              callback_data: choice
            }
          })
        ]
      };
    }
    bot.sendMessage(this.userId, text, opts);
  }
  close(){
    delete this.manager.interactions[this.userId];
  }  
}
class InteractionsManager{
  constructor(){
    this.interactions = {};
  }
  getInteraction(userId){
    return this.interactions[userId];
  }
  newInteraction(userId, workflowId, signalId){
    this.interactions[userId] = new InteractionHandler(userId,workflowId,signalId, this);
    return this.interactions[userId];
  }
  sendMessage(userId, message){
    bot.sendMessage(userId, message, {});
  }
}
const manager =new InteractionsManager()

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery) {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const from = msg.chat.id;
  const interaction = manager.getInteraction(from);
  // console.log(from,interaction,callbackQuery);
  await interaction.triggerCallback(action);

});
async function handleNewConversation(userId, text){
  var worfklow = 'start';
  var workflowClass = 'mainTelegram';
  if(text == "/start"){
    workflowClass = 'mainTelegram';
    worfklow = 'start';
  }
  if(worfklow)
    await schedulerClient.run({className:workflowClass,name:worfklow,args:[{telegramUserId:userId,telegramText:text}],id:'sampleTelegram1-' + new Date().getTime()});

}
// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async (msg) => {
  // if(conversations)
  // const chatId = msg.from.id;
  const from = msg.from.id;
  var interaction = manager.getInteraction(from);
  if(!interaction){
    await handleNewConversation(msg.from.id, msg.text);
    // not in conversation. maybe start one through scheduler.
  }
  else{
    await interaction.triggerCallback(msg.text);    
  }
   
  // send a message to the chat acknowledging receipt of their message
  // bot.sendMessage(chatId, 'Received your message');
});

export default manager;