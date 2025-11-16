import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Sortable from 'sortablejs';
import './DebugDashboard.css';
import axios from 'axios';
import { getLatestMessag, getTableNames, BACKEND_URL } from '../../services/flask';

const DebugDashboard = () => {
    const [tableNames, setTableNames] = useState([]);
    const [checkedTables, setCheckedTables] = useState(["MotorCommands", "DashboardCommands"]);
    const [tableMessages, setTableMessages] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const socketRef = useRef(null);
    const messageContainerRef = useRef(null);

    useEffect(() => {
        //establish socketIO connection
        //using reference avoids updating reloading when socket is updated
        socketRef.current = io(BACKEND_URL);

        socketRef.current.on('new-messages', (data) => {
            if (data.messages){
                data.messages.forEach(displayMessage);
            }
        });

        //sortable intilization
        //will allow message containers to be dragged and dropped
        if(messageContainerRef.current){
            new Sortable(messageContainerRef.current, {
                handle: '.card-header',
                animation: 150,
            });
        }

    const fetchTableNames = async () => {
        try{
            const names = await getTableNames();
            setTableNames(names);
        } catch(error){
            console.error('Error fetching table names inside DebugDashbor.jsx', error);
            setTableNames([]);
        }
    };

    fetchTableNames();

        //cleanup, disconnects components
        return () => {
            if(socketRef.current){
                socketRef.current.disconnect();
            }
        };
    }, []);

        const displayMessage = (data) => {
        const { table_name: tableName } = data;

        setTableMessages(prevMessages => {
            const updatedMessages = { ...prevMessages };
            
            if (!updatedMessages[tableName]) {
                updatedMessages[tableName] = [];
            }

            // Add new message, limit to last 5 messages per table
            updatedMessages[tableName].unshift(data);
            if (updatedMessages[tableName].length > 5) {
                updatedMessages[tableName].pop();
            }

            return updatedMessages;
        });
    };

    const handleTableCheckboxChange = (tableName) => {
        setCheckedTables(prev => 
            prev.includes(tableName)
                ? prev.filter(name => name !== tableName)
                : [...prev, tableName]
        );
    };

    const formatMessageContent = (msg) => {
        return Object.entries(msg.data)
            .map(([k, v]) => {
                if (typeof v === 'object' && v !== null && 'value' in v && 'unit' in v) {
                    return v.unit && v.unit !== "null" && v.unit !== ""
                        ? `${k}: ${v.value} ${v.unit}`
                        : `${k}: ${v.value}`;
                }
                return `${k}: ${v}`;
            })
            .join('\n');
    };

    
    const filteredTableNames = tableNames.filter(name => 
        name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container-fluid mt-4">
            <div className="row">
                <div className="col-md-8">
                    <div 
                        ref={messageContainerRef} 
                        className="large-container" 
                        id="messageContainer"
                    >
                        {Object.entries(tableMessages)
                            .filter(([tableName]) => 
                                checkedTables.length === 0 || checkedTables.includes(tableName)
                            )
                            .map(([tableName, messages]) => (
                                <div key={tableName} className="card mt-3" id={`card_${tableName}`}>
                                    <div className="card-header">{tableName}</div>
                                    <div className="card-body" id={`cardBody_${tableName}`}>
                                        {messages.map((msg, index) => (
                                            <div key={index} className="message mb-2">
                                                <span className="time-elapsed">
                                                    {new Date(msg.timestamp).toLocaleString()}
                                                </span>
                                                <br />
                                                {formatMessageContent(msg)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
                <div className="col-md-4">
                    {/* Checkbox section remains the same as previous implementation */}
                    <div className="small-container" style={{ height: '600px' }}>
                        <div className="text-container">
                            <h5>Message Types</h5>
                            <input
                                type="text"
                                className="form-control mb-3"
                                placeholder="Search tables..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <hr className="separator" />
                        <div className="small-container mt-4" style={{ height: '350px' }}>
                            <div className="text-container">
                                <form>
                                    {filteredTableNames.map(name => (
                                        <div key={name} className="checkbox-wrapper">
                                            <input
                                                type="checkbox"
                                                id={`checkbox_${name}`}
                                                name="tableName"
                                                value={name}
                                                checked={checkedTables.includes(name)}
                                                onChange={() => handleTableCheckboxChange(name)}
                                            />
                                            <label htmlFor={`checkbox_${name}`}>{name}</label>
                                        </div>
                                    ))}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugDashboard;
