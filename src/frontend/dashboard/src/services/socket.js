import { io } from 'socket.io-client';

// "undefined" means the URL will be computed from the `window.location` object
// If the environment is production, set URL to undefined; 
    // otherwise, set it to 'http://localhost:4000'
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';

export const socket = io(URL);