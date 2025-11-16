import axios from 'axios';
import { get } from 'sortablejs';

const BACKEND_URL = "http://localhost:5500/"

export const getTableNames = async () => {
    try{
        let response = await axios.get((`${BACKEND_URL}/get_table_names`));
        if(Array.isArray(response.table_names))
        return response.table_names.filter
        //TO-DO: filter out tables that we do not need
        (name => ![].includes(name));
    } catch(error){
        console.log('Error getting table names', error);
        return [];
    }
}

export const getLatestMessage = async () => {
    try{
        let response = await axios.get((`${BACKEND_URL}/get_latest_message`));
        return response;
    } catch(error){
        console.log('Erorr getting latest message', error);
    }
}

export {BACKEND_URL};