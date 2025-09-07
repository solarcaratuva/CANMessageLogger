// Initialize socket connection
const socket = io();

// Store active signals and their data
const activeSignals = new Map();
let globalRequestCounter = 0;
let visibleInFlight = false;
let visiblePending = null; // { startTime, endTime, zoomLevel, viewportWidth }
let lastVisibleRequestId = 0;

// Initialize Plotly graph
const graphDiv = document.getElementById('graph');
const layout = {
    title: 'CAN Signal Data',
    xaxis: {
        title: 'Time',
        type: 'linear',
        rangeslider: { visible: false },
    },
    yaxis: {
        title: 'Value',
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

// Function to request data for a specific range with coalescing and requestId
function requestDataRange(signalId, startTime, endTime, zoomLevel) {
    const viewportWidth = Math.floor(graphDiv.clientWidth || graphDiv.getBoundingClientRect().width || 1200);
    const info = activeSignals.get(signalId);
    if (!info) return;

    const params = { startTime, endTime, zoomLevel, viewportWidth };

    if (info.inFlight) {
        info.pending = params; // coalesce to the latest
        return;
    }

    info.inFlight = true;
    const requestId = ++globalRequestCounter;
    info.lastRequestId = requestId;

    socket.emit('request_data_range', {
        signal_id: signalId,
        start_time: startTime,
        end_time: endTime,
        zoom_level: zoomLevel,
        viewport_width: viewportWidth,
        request_id: requestId
    });
}

// Bulk request for all active signals in current visible range
function requestVisibleRange(startTime, endTime, zoomLevel) {
    const viewportWidth = Math.floor(graphDiv.clientWidth || graphDiv.getBoundingClientRect().width || 1200);
    const signalIds = Array.from(activeSignals.keys());
    if (signalIds.length === 0) return;

    const params = { startTime, endTime, zoomLevel, viewportWidth };

    if (visibleInFlight) {
        visiblePending = params; // coalesce to latest
        return;
    }

    visibleInFlight = true;
    const requestId = ++globalRequestCounter;
    lastVisibleRequestId = requestId;

    socket.emit('request_visible_range', {
        signal_ids: signalIds,
        start_time: startTime,
        end_time: endTime,
        zoom_level: zoomLevel,
        viewport_width: viewportWidth,
        request_id: requestId
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
            line: { color: info.color }
        });
    });
    Plotly.react(graphDiv, data, layout);
}

// Handle data updates from server
socket.on('data_range_update', function(data) {
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
        const { startTime, endTime, zoomLevel, viewportWidth } = info.pending;
        info.pending = null;
        // Immediately send the latest pending request
        const requestId = ++globalRequestCounter;
        info.lastRequestId = requestId;
        socket.emit('request_data_range', {
            signal_id: signalId,
            start_time: startTime,
            end_time: endTime,
            zoom_level: zoomLevel,
            viewport_width: viewportWidth,
            request_id: requestId
        });
        info.inFlight = true;
    }
});

// Handle bulk visible-range updates
socket.on('visible_range_update', function(payload) {
    if (typeof payload.request_id === 'number' && payload.request_id < lastVisibleRequestId) {
        return; // stale
    }
    const series = payload.signals || {};
    Object.keys(series).forEach((signalId) => {
        const info = activeSignals.get(signalId);
        if (!info) return;
        const s = series[signalId];
        info.x = Array.isArray(s.x) ? s.x : [];
        info.y = Array.isArray(s.y) ? s.y : [];
    });
    rebuildPlot();

    visibleInFlight = false;
    if (visiblePending) {
        const { startTime, endTime, zoomLevel, viewportWidth } = visiblePending;
        visiblePending = null;
        const requestId = ++globalRequestCounter;
        lastVisibleRequestId = requestId;
        socket.emit('request_visible_range', {
            signal_ids: Array.from(activeSignals.keys()),
            start_time: startTime,
            end_time: endTime,
            zoom_level: zoomLevel,
            viewport_width: viewportWidth,
            request_id: requestId
        });
        visibleInFlight = true;
    }
});

// Handle errors
socket.on('data_range_error', function(data) {
    console.error('Error fetching data:', data.message);
});

// Function to add a new signal to the graph
function addSignal(signalId, signalName, color) {
    if (activeSignals.has(signalId)) return;
    
    // Add empty trace
    const trace = {
        x: [],
        y: [],
        type: 'scattergl',
        mode: 'lines',
        name: signalName,
        line: { color: color }
    };
    
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
    
    // Get initial data (bulk)
    const currentRange = graphDiv.layout.xaxis.range;
    if (currentRange) {
        const startTime = Number(currentRange[0]);
        const endTime = Number(currentRange[1]);
        requestVisibleRange(startTime, endTime, 1);
    }
}

// Function to remove a signal from the graph
function removeSignal(signalId) {
    const signalData = activeSignals.get(signalId);
    if (!signalData) return;
    
    activeSignals.delete(signalId);
    rebuildPlot();
}

// Export functions for use in other files
window.graphView = {
    addSignal,
    removeSignal
}; 

// Idle polling to recover from transient misses: every 1s, request current visible range
setInterval(() => {
    const rng = graphDiv.layout && graphDiv.layout.xaxis && graphDiv.layout.xaxis.range;
    if (!rng || rng.length < 2) return;
    const startTime = Number(rng[0]);
    const endTime = Number(rng[1]);
    const timeRange = Math.max(1, endTime - startTime);
    const zoomLevel = Math.max(1, Math.min(10, Math.floor(100 / timeRange)));
    requestVisibleRange(startTime, endTime, zoomLevel);
}, 1000);