import { Client } from 'discord.js';
import { IEvent } from '../core/IEvent';
import { ACTIVITIES } from '../config';
import { errorTracker } from '../core/errorTracker';

// LABEL: EVENT DEFINITION
const event: IEvent<'clientReady'> = { 
    name: 'clientReady',
    once: false,
    
async execute(client: Client) {
    const setRandomActivity = () => {
        const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
        client.user?.setActivity(activity.name, { type: activity.type });
    };
    
    setRandomActivity(); 
    setInterval(setRandomActivity, 8000); 
},

};

export default event;