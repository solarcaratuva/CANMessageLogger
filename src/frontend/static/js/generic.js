(function() {
    const ACTIVE_KEY = 'active_auto_fault_id';
    const latestAlertDiv = document.getElementById('latestAlert');
    const errorCard = document.getElementById('errorCard');
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Function to set page title and active navigation based on current URL
    function setPageTitleAndActiveNav() {
        const pageTitleElement = document.getElementById('pageTitle');
        const errorCardTitleElement = document.getElementById('errorCardTitle');
        const currentPath = window.location.pathname;
        
        // Remove active class from all nav items
        document.querySelectorAll('.navbar-nav .nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        let pageTitle = 'Unknown Page';
        let activeNavId = null;
        
        switch(currentPath) {
            case '/':
                pageTitle = 'Debug Dashboard';
                activeNavId = 'nav-debug';
                break;
            case '/alert_manager':
                pageTitle = 'Alert Manager';
                activeNavId = 'nav-alerts';
                break;
            case '/graphs':
                pageTitle = 'Graphs';
                activeNavId = 'nav-graphs';
                break;
            case '/graph_view':
                pageTitle = 'Graph View';
                activeNavId = 'nav-graphs';
                break;
            default:
                // Extract page name from URL path
                const pathSegments = currentPath.split('/').filter(segment => segment);
                if (pathSegments.length > 0) {
                    pageTitle = pathSegments[pathSegments.length - 1]
                        .replace(/[-_]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                } else {
                    pageTitle = 'Home';
                }
        }
        
        // Set the page title in navbar
        if (pageTitleElement) {
            pageTitleElement.textContent = pageTitle;
        }
        
        // Set the error card title
        if (errorCardTitleElement) {
            errorCardTitleElement.textContent = pageTitle;
        }
        
        // Set the active navigation item
        if (activeNavId) {
            const activeNavElement = document.getElementById(activeNavId);
            if (activeNavElement) {
                activeNavElement.classList.add('active');
            }
        }
    }

    function renderNoErrors() {
        latestAlertDiv.textContent = 'No errors currently.';
        latestAlertDiv.className = 'alert alert-info';
        document.body.classList.remove('alert-active', 'alert-active-red');
        errorCard.classList.remove('alert-highlight', 'alert-critical');
    }

    function fillAlertDiv(latest) {
        latestAlertDiv.innerHTML = `
            <strong>Alert:</strong> ${latest.name} — ${latest.signal} |
            <strong>Value:</strong> ${latest.fail_cause} |
            <strong>CAN Msg ID:</strong> ${latest.category} (${latest.can_message_id}) |
            <strong>CAN Data:</strong> ${latest.can_message_data} |
            <strong>Timestamp:</strong> ${Math.round(latest.can_message_timestamp)}
            <button class="btn btn-sm btn-outline-dark float-right ml-3" id="clearAlertBtn">Clear</button>
        `;
        latestAlertDiv.classList.remove('alert-info');
        latestAlertDiv.classList.add('alert-danger');

        document.getElementById('clearAlertBtn').addEventListener('click', () => {
            localStorage.removeItem(ACTIVE_KEY);
            localStorage.setItem('cleared_trigger_id', latest.id);
            console.log('Cleared auto-fault ID and set cleared_trigger_id:', latest.id);
            renderNoErrors();
        });
    }

    function renderAutoFault(latest) {
        document.body.classList.add('alert-active-red');
        errorCard.classList.add('alert-critical');
        fillAlertDiv(latest);
    }

    function renderWarning(latest) {
        document.body.classList.add('alert-active');
        errorCard.classList.add('alert-highlight');
        fillAlertDiv(latest);
    }

    function fetchMostRecentAlert() {
        console.log('Fetching most recent alert...');
        fetch('/get_triggered_alerts')
            .then(resp => resp.json())
            .then(data => {
                if (data.status !== 'success' || !data.triggered_alerts || data.triggered_alerts.length === 0) {
                    // If no alerts, ensure any stored active fault ID is removed
                    localStorage.removeItem(ACTIVE_KEY);
                    return renderNoErrors();
                }

                // Sort by timestamp, newest first
                const triggered = data.triggered_alerts.sort((a, b) =>
                    new Date(b.can_message_timestamp) - new Date(a.can_message_timestamp)
                );

                const activeAutoId = localStorage.getItem(ACTIVE_KEY);
                const clearedTriggerId = localStorage.getItem('cleared_trigger_id');

                // --- START: Prioritize Active Auto-Fault ---
                if (activeAutoId) {
                    // Find the alert matching the stored active ID within the current triggered list
                    const activeFault = triggered.find(alert => alert.id.toString() === activeAutoId);

                    if (activeFault) {
                        // The active fault IS still triggered. Display it and stop further processing.
                        console.log(`Active auto-fault ${activeAutoId} found in triggered list. Rendering it.`);
                        renderAutoFault(activeFault);
                        return; // Important: Stop here, don't process other alerts
                    } else {
                        // The stored active fault ID is no longer in the triggered list
                        // (maybe cleared server-side or resolved). Remove it from storage.
                        console.log(`Stored active auto-fault ${activeAutoId} not found in triggered list. Removing from localStorage.`);
                        localStorage.removeItem(ACTIVE_KEY);
                        // Continue processing below to check the latest alert...
                    }
                }
                // --- END: Prioritize Active Auto-Fault ---


                // If we reach here, either there was no activeAutoId, or the stored one is no longer valid.
                // Process the absolute latest alert.
                const latest = triggered[0];

                // If user explicitly cleared this specific latest alert via the button
                if (clearedTriggerId && parseInt(clearedTriggerId) === latest.id) {
                    console.log(`Latest alert ${latest.id} matches the recently cleared ID. Rendering no errors.`);
                    return renderNoErrors();
                }

                // Check if the latest alert is an auto-fault (and should become the new active one)
                const isAutoFault = latest.fail_cause && latest.fail_cause.trim().toUpperCase() === 'AUTO FAULT';
                if (isAutoFault) {
                    console.log(`Latest alert ${latest.id} is a new auto-fault. Storing and rendering.`);
                    localStorage.setItem(ACTIVE_KEY, latest.id);
                    return renderAutoFault(latest);
                }

                // Otherwise, it's a normal warning
                console.log(`Rendering latest alert ${latest.id} as a warning.`);
                renderWarning(latest);
            })
            .catch(err => {
                console.error('Error fetching triggered alerts:', err);
                latestAlertDiv.textContent = 'Error fetching triggered alerts.';
                latestAlertDiv.className = 'alert alert-warning'; // Use warning for fetch errors maybe?
                document.body.classList.remove('alert-active', 'alert-active-red');
                errorCard.classList.remove('alert-highlight', 'alert-critical');
                // Optionally clear active key on error? Depends on desired behaviour.
                // localStorage.removeItem(ACTIVE_KEY);
            });
    }

    function fetchAlerts() {
        fetch('/get_alerts')
            .then(resp => resp.json())
            .then(data => {
                const container = document.getElementById('alertHistoryContainer');
                if (!container) return;

                container.innerHTML = '';
                if (data.status === 'success' && data.alerts.length > 0) {
                    let html = '<ul>';
                    data.alerts.forEach(alert => {
                        html += `<li>${alert.name} — ${alert.field}</li>`;
                    });
                    html += '</ul>';
                    container.innerHTML = html;
                } else {
                    container.innerHTML = '<div>No alerts found.</div>';
                }
            })
            .catch(err => console.error('Error fetching alerts:', err));
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Set the page title and active navigation based on current URL
        setPageTitleAndActiveNav();
        
        // Clean up stale cleared_trigger_id
        const clearedTriggerId = localStorage.getItem('cleared_trigger_id');
        if (clearedTriggerId) {
            fetch('/get_triggered_alerts')
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'success') {
                        const exists = data.triggered_alerts.some(a => a.id === parseInt(clearedTriggerId));
                        if (!exists) {
                            console.log('Cleared ID no longer valid, removing.');
                            localStorage.removeItem('cleared_trigger_id');
                        }
                    }
                })
                .finally(fetchMostRecentAlert)
                .catch(err => { console.error(err); fetchMostRecentAlert(); });
        } else {
            fetchMostRecentAlert();
        }

        setInterval(fetchMostRecentAlert, 30000);

        socket.on('big_popup_event', data => {
            console.log('Received big_popup_event:', data);
            fetchMostRecentAlert();
            if (typeof fetchTriggeredAlerts === 'function') {
                fetchTriggeredAlerts();
            }
        });
    });
})();

