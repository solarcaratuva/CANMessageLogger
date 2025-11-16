import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Sortable from 'sortablejs';
import './DebugDashboard.css';
import { getLatestMessage, getTableNames, BACKEND_URL } from '../../services/flask';
import 'bootstrap/dist/css/bootstrap.min.css';

const DebugDashboard = () => {
    const [tableNames, setTableNames] = useState([]);
    const [checkedTables, setCheckedTables] = useState(["MotorCommands", "DashboardCommands"]);
    const [tableMessages, setTableMessages] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [lastReceivedTime, setLastReceivedTime] = useState({});
    const [lastTimeStamp, setLastTimeStamp] = useState({});
    
    const socketRef = useRef(null);
    const messageContainerRef = useRef(null);
    const maxMessagesPerTable = 1;

    // Fetch table names on mount
    useEffect(() => {
        const fetchTableNames = async () => {
            try {
                const data = await getTableNames();
                if (Array.isArray(data.table_names)) {
                    // Filter out unwanted tables
                    const filtered = data.table_names.filter(
                        name => !["sqlite_sequence", "Alerts", "TriggeredAlerts"].includes(name)
                    );
                    setTableNames(filtered);
                }
            } catch (error) {
                console.error('Error fetching table names:', error);
                setTableNames([]);
            }
        };

        fetchTableNames();
    }, []);

    // Setup socket connection and sortable
    useEffect(() => {
        // Establish socketIO connection
        socketRef.current = io(BACKEND_URL);

        socketRef.current.on('new-messages', (data) => {
            if (data.messages) {
                data.messages.forEach(displayMessage);
            }
        });

        // Sortable initialization
        if (messageContainerRef.current) {
            new Sortable(messageContainerRef.current, {
                handle: '.card-header',
                animation: 150,
                onStart: (evt) => {
                    evt.item.style.opacity = '0.5';
                },
                onEnd: (evt) => {
                    evt.item.style.opacity = '1';
                }
            });
        }

        // Cleanup
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Poll for latest messages
    useEffect(() => {
        const fetchLatestMessages = async () => {
            try {
                const batchData = await getLatestMessage();
                if (batchData.messages) {
                    batchData.messages.forEach(displayMessage);
                }
            } catch (error) {
                console.error('Message fetch error:', error);
            }
        };

        const messageInterval = setInterval(fetchLatestMessages, 1000);
        
        return () => clearInterval(messageInterval);
    }, []);

    // Update elapsed time display
    useEffect(() => {
        const updateInterval = setInterval(() => {
            setLastReceivedTime(prev => ({ ...prev })); // Trigger re-render
        }, 1000);

        return () => clearInterval(updateInterval);
    }, []);

    const displayMessage = (data) => {
        const { table_name: tableName, timestamp } = data;

        // Prevent duplicate messages
        setLastTimeStamp(prev => {
            if (prev[tableName] === timestamp) return prev;
            
            const newTimestamps = { ...prev, [tableName]: timestamp };
            
            // Update received time
            setLastReceivedTime(prevTime => ({
                ...prevTime,
                [tableName]: Date.now()
            }));

            // Update messages
            setTableMessages(prevMessages => {
                const updatedMessages = { ...prevMessages };
                
                if (!updatedMessages[tableName]) {
                    updatedMessages[tableName] = [];
                }

                updatedMessages[tableName].push(data);
                
                // Limit to max messages per table
                if (updatedMessages[tableName].length > maxMessagesPerTable) {
                    updatedMessages[tableName].shift();
                }

                return updatedMessages;
            });

            return newTimestamps;
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

    const getElapsedTime = (tableName) => {
        const now = Date.now();
        const lastTime = lastReceivedTime[tableName];
        if (!lastTime) return "Just now";

        const elapsed = Math.floor((now - lastTime) / 1000);
        if (elapsed < 60) {
            return `${elapsed} seconds ago`;
        }
        return `${Math.floor(elapsed / 60)} minutes ago`;
    };

    const filteredTableNames = tableNames.filter(name => 
        name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Determine which tables to show
    const visibleTables = checkedTables.length === 0 
        ? Object.keys(tableMessages) 
        : checkedTables;

    return (
        <div className="container-fluid mt-4">
            <div className="row">
                {/* Left large container */}
                <div className="col-md-8">
                    <div 
                        ref={messageContainerRef} 
                        className="large-container" 
                        id="messageContainer"
                    >
                        {Object.entries(tableMessages)
                            .filter(([tableName]) => visibleTables.includes(tableName))
                            .map(([tableName, messages]) => (
                                <div 
                                    key={tableName} 
                                    className="card mt-3" 
                                    id={`card_${tableName}`}
                                >
                                    <div className="card-header">{tableName}</div>
                                    <div className="card-body" id={`cardBody_${tableName}`}>
                                        {messages.map((msg, index) => (
                                            <div key={index} className="message mb-2">
                                                {msg.timestamp !== -1 ? (
                                                    <>
                                                        <span className="time-elapsed">
                                                            {getElapsedTime(tableName)}
                                                        </span>
                                                        <br />
                                                        {formatMessageContent(msg)}
                                                    </>
                                                ) : (
                                                    "No Messages Received"
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Right smaller containers */}
                <div className="col-md-4">
                    <div className="small-container" id="checkbox-container" style={{ height: '600px' }}>
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
                                <form id="table-names-form">
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