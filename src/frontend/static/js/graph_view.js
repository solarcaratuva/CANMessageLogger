// HTTP polling configuration
const POLLING_INTERVAL = 1000; // milliseconds (1 second for live updates)
let pollingActive = false;
let currentPollingTimeout = null;

// Live data configuration
const LIVE_WINDOW_SIZE = 60; // seconds - how much historical data to show in live mode
let liveMode = true; // Start in live mode by default
let globalTimeRange = { min: 0, max: 60 }; // Global time range tracker

// Store active signals and their data
const activeSignals = new Map();
let globalRequestCounter = 0;
let visibleInFlight = false;
let visiblePending = null; // { startTime, endTime, zoomLevel, viewportWidth }
let lastVisibleRequestId = 0;

// Initialize Plotly graph
const graphDiv = document.getElementById('graphContainer');
const layout = {
    title: 'CAN Signal Data',
    xaxis: {
        title: 'Time',
        type: 'linear',
        rangeslider: { visible: false },
        autorange: true,
    },
    yaxis: {
        title: 'Value',
        autorange: true,
    },
    showlegend: true,
};

Plotly.newPlot(graphDiv, [], layout);

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle zoom and pan events (debounced)
graphDiv.on('plotly_relayout', debounce(function(eventdata) {
    if (eventdata['xaxis.range[0]'] && eventdata['xaxis.range[1]']) {
        // Treat ranges as numeric seconds
        const startTime = Number(eventdata['xaxis.range[0]']);
        const endTime = Number(eventdata['xaxis.range[1]']);
        
        // Calculate zoom level based on time range
        const timeRange = Math.max(1, endTime - startTime); // seconds
        const zoomLevel = Math.max(1, Math.min(10, Math.floor(100 / timeRange)));
        
        requestVisibleRange(startTime, endTime, zoomLevel);
    }
}, 200));

// Function to request data for a specific range (now using HTTP)
function requestDataRange(signalId, startTime, endTime, zoomLevel) {
    // For single signal requests, we'll use the bulk endpoint with one signal
    requestVisibleRange(startTime, endTime, zoomLevel, [signalId]);
}

// Bulk request for all active signals in current visible range (now using HTTP)
function requestVisibleRange(startTime, endTime, zoomLevel, specificSignalIds = null) {
    const viewportWidth = Math.floor(graphDiv.clientWidth || graphDiv.getBoundingClientRect().width || 1200);
    const signalIds = specificSignalIds || Array.from(activeSignals.keys());
    if (signalIds.length === 0) return;

    const params = { startTime, endTime, zoomLevel, viewportWidth };

    if (visibleInFlight) {
        visiblePending = params; // coalesce to latest
        return;
    }

    visibleInFlight = true;
    const requestId = ++globalRequestCounter;
    lastVisibleRequestId = requestId;

    // Use fetch API for HTTP request
    fetch('/get_visible_range', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            signal_ids: signalIds,
            start_time: startTime,
            end_time: endTime,
            zoom_level: zoomLevel,
            viewport_width: viewportWidth
        })
    })
    .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                handleVisibleRangeUpdate({
                    signals: data.signals,
                    request_id: requestId
                });
            } else {
                console.error('Error fetching data:', data.message);
                updateDataStatus('inactive');
            }
        })
    .catch(error => {
        console.error('Network error:', error);
        updateDataStatus('inactive');
        visibleInFlight = false; // Reset on error
    });
}

function rebuildPlot() {
    const data = [];
    activeSignals.forEach((info) => {
        data.push({
            x: info.x || [],
            y: info.y || [],
            type: 'scattergl',
            mode: 'lines',
            name: info.name,
            line: { color: info.color },
            connectgaps: true
        });
    });
    Plotly.react(graphDiv, data, layout);
    
    // Only auto-range Y-axis, let live mode handle X-axis
    if (!liveMode) {
        // In manual mode, auto-range both axes
        Plotly.relayout(graphDiv, {
            'xaxis.autorange': true,
            'yaxis.autorange': true
        });
    } else {
        // In live mode, only auto-range Y-axis
        Plotly.relayout(graphDiv, {
            'yaxis.autorange': true
        });
    }
}

// Handle data updates from server (now a regular function)
function handleDataRangeUpdate(data) {
    const signalId = data.signal_id;
    const info = activeSignals.get(signalId);
    if (!info) return;

    // Drop stale responses
    if (typeof data.request_id === 'number' && typeof info.lastRequestId === 'number' && data.request_id < info.lastRequestId) {
        return;
    }

    // Expect compact arrays: x (timestamps as numbers), y (values)
    const x = Array.isArray(data.x) ? data.x : [];
    const y = Array.isArray(data.y) ? data.y : [];

    info.x = x;
    info.y = y;

    rebuildPlot();

    // Mark request complete and send any pending
    info.inFlight = false;
    if (info.pending) {
        const { startTime, endTime, zoomLevel } = info.pending;
        info.pending = null;
        // Immediately send the latest pending request
        requestVisibleRange(startTime, endTime, zoomLevel, [signalId]);
    }
}

// Handle bulk visible-range updates (now a regular function)
function handleVisibleRangeUpdate(payload) {
    if (typeof payload.request_id === 'number' && payload.request_id < lastVisibleRequestId) {
        return; // stale
    }
    const series = payload.signals || {};
    let hasData = false;
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    Object.keys(series).forEach((signalId) => {
        const info = activeSignals.get(signalId);
        if (!info) return;
        const s = series[signalId];
        info.x = Array.isArray(s.x) ? s.x : [];
        info.y = Array.isArray(s.y) ? s.y : [];
        
        // Track data presence and time range
        if (info.x.length > 0) {
            hasData = true;
            minTime = Math.min(minTime, Math.min(...info.x));
            maxTime = Math.max(maxTime, Math.max(...info.x));
        }
    });
    
    rebuildPlot();
    
    // Update global time range
    if (hasData) {
        globalTimeRange.min = Math.min(globalTimeRange.min, minTime);
        globalTimeRange.max = Math.max(globalTimeRange.max, maxTime);
        
        updateDataStatus('active', minTime, maxTime);
        
        // In live mode, auto-scroll to show latest data
        if (liveMode) {
            const latestTime = globalTimeRange.max;
            const windowStart = Math.max(0, latestTime - LIVE_WINDOW_SIZE);
            
            // Update the graph to show the live window
            Plotly.relayout(graphDiv, {
                'xaxis.range': [windowStart, latestTime + 2], // Add small buffer
                'xaxis.autorange': false // Disable autorange for live scrolling
            });
        }
    } else {
        updateDataStatus('inactive');
    }

    visibleInFlight = false;
    if (visiblePending) {
        const { startTime, endTime, zoomLevel } = visiblePending;
        visiblePending = null;
        requestVisibleRange(startTime, endTime, zoomLevel);
    }
}

// Handle errors (now handled in fetch catch blocks)

// Function to update data status indicator and time range display
function updateDataStatus(status, minTime, maxTime) {
    // Update the HTML status indicator if the function exists
    if (typeof window.updateDataIndicator === 'function') {
        window.updateDataIndicator(status);
    }
    
    // Update time range displays if elements exist
    if (minTime !== undefined && maxTime !== undefined && isFinite(minTime) && isFinite(maxTime)) {
        const currentTimeElement = document.getElementById('currentTimestamp');
        const timeRangeElement = document.getElementById('timeRange');
        
        if (currentTimeElement) {
            currentTimeElement.textContent = `Current Time: ${maxTime.toFixed(3)}s`;
        }
        if (timeRangeElement) {
            timeRangeElement.textContent = `Data Range: ${minTime.toFixed(3)}s - ${maxTime.toFixed(3)}s`;
        }
        
        // Store global time range for other functions to use
        window.globalMinTime = minTime;
        window.globalMaxTime = maxTime;
    }
}

// Polling mechanism for continuous data updates
function startPolling() {
    if (pollingActive) return;
    pollingActive = true;
    
    // Set status to receiving immediately
    updateDataStatus('receiving');
    
    function poll() {
        if (!pollingActive) return;
        
        if (activeSignals.size > 0) {
            let startTime, endTime, zoomLevel;
            
            if (liveMode) {
                // Live mode: always request latest data
                // Get the most recent timestamp from database (or use current time as approximation)
                const now = globalTimeRange.max || Date.now() / 1000; // Convert to seconds if using current time
                endTime = now + 5; // Add buffer for new data
                startTime = Math.max(0, endTime - LIVE_WINDOW_SIZE);
                zoomLevel = 3; // Medium zoom for live data
                
                console.log(`Live polling: requesting ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s`);
            } else {
                // Manual mode: use current visible range
                const rng = graphDiv.layout && graphDiv.layout.xaxis && graphDiv.layout.xaxis.range;
                if (rng && rng.length >= 2) {
                    startTime = Number(rng[0]);
                    endTime = Number(rng[1]);
                    const timeRange = Math.max(1, endTime - startTime);
                    zoomLevel = Math.max(1, Math.min(10, Math.floor(100 / timeRange)));
                } else {
                    // Fallback to global range
                    startTime = globalTimeRange.min;
                    endTime = globalTimeRange.max;
                    zoomLevel = 3;
                }
            }
            
            requestVisibleRange(startTime, endTime, zoomLevel);
        }
        
        // Schedule next poll
        currentPollingTimeout = setTimeout(poll, POLLING_INTERVAL);
    }
    
    poll();
}

function stopPolling() {
    pollingActive = false;
    if (currentPollingTimeout) {
        clearTimeout(currentPollingTimeout);
        currentPollingTimeout = null;
    }
    // Set status to inactive when polling stops
    updateDataStatus('inactive');
}

// Function to add a new signal to the graph
function addSignal(signalId, signalName, color) {
    if (activeSignals.has(signalId)) return;
    
    // Store signal info
    activeSignals.set(signalId, {
        name: signalName,
        color: color,
        x: [],
        y: [],
        inFlight: false,
        pending: null,
        lastRequestId: 0
    });

    // Build or update the plot using react
    rebuildPlot();
    
    // Start polling if this is the first signal
    if (activeSignals.size === 1) {
        startPolling();
    }
    
    // Get initial data (bulk)
    const currentRange = graphDiv.layout.xaxis.range;
    if (currentRange) {
        const startTime = Number(currentRange[0]);
        const endTime = Number(currentRange[1]);
        const timeRange = Math.max(1, endTime - startTime);
        const zoomLevel = Math.max(1, Math.min(10, Math.floor(100 / timeRange)));
        requestVisibleRange(startTime, endTime, zoomLevel);
    }
}

// Function to remove a signal from the graph
function removeSignal(signalId) {
    const signalData = activeSignals.get(signalId);
    if (!signalData) return;
    
    activeSignals.delete(signalId);
    rebuildPlot();
    
    // Stop polling if no signals remain
    if (activeSignals.size === 0) {
        stopPolling();
    }
}

// Mode switching functions
function setLiveMode() {
    liveMode = true;
    console.log('Switched to live mode');
    // Immediately poll for latest data
    if (pollingActive && activeSignals.size > 0) {
        const now = globalTimeRange.max || Date.now() / 1000;
        const endTime = now + 5;
        const startTime = Math.max(0, endTime - LIVE_WINDOW_SIZE);
        requestVisibleRange(startTime, endTime, 3);
    }
}

function setManualMode() {
    liveMode = false;
    console.log('Switched to manual mode');
}

function showAllData() {
    setManualMode();
    if (globalTimeRange.min < globalTimeRange.max) {
        const margin = (globalTimeRange.max - globalTimeRange.min) * 0.05;
        Plotly.relayout(graphDiv, {
            'xaxis.range': [globalTimeRange.min - margin, globalTimeRange.max + margin],
            'xaxis.autorange': false,
            'yaxis.autorange': true
        });
    }
}

function setAutoRange() {
    setManualMode();
    Plotly.relayout(graphDiv, {
        'xaxis.autorange': true,
        'yaxis.autorange': true
    });
}

// Export functions for use in other files
window.graphView = {
    addSignal,
    removeSignal,
    startPolling,
    stopPolling,
    setLiveMode,
    setManualMode,
    showAllData,
    setAutoRange
};

// Debug logging
console.log('graph_view.js loaded successfully');
console.log('graphDiv element found:', !!graphDiv);
console.log('window.graphView exported:', !!window.graphView);