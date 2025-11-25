// ------------- NEW Variables to store category -------------
let selectedField = null;
let selectedFieldType = null;
let selectedCategory = null;

function deleteAlert(alertId) {
  fetch('/delete_alert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({"alert_id": alertId}),
  })
  .then((response) => response.json())
  .then((data) => {
    if (data.status === 'success') {
      fetchAlerts();
    } else {
      console.error('Error deleting alert:', data.message);
    }
  })
  .catch((error) => {
    console.error('Error deleting alert:', error);
  });
}

// Modified to display all triggered alerts in one table, with "Alert Category"
function fetchTriggeredAlerts() {
  fetch('/get_triggered_alerts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then((response) => response.json())
  .then((data) => {
    const alertHistoryContainer = document.getElementById('alertHistoryContainer');
    alertHistoryContainer.innerHTML = ''; // Clear previous content

    if (data.status === 'success' && data.triggered_alerts.length > 0) {
      // Sort by can_message_timestamp desc
      data.triggered_alerts.sort(
        (a, b) => new Date(b.can_message_timestamp) - new Date(a.can_message_timestamp)
      );

      let tableHtml = `
        <div class="table-responsive">
          <table class="table table-bordered table-striped">
            <thead class="thead-dark">
              <tr>
                <th>#</th>
                <th>Triggered Item</th>
                <th>Value</th>
                <th>CAN Message ID</th>
                <th>CAN Data</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
      `;

      data.triggered_alerts.forEach((alert) => {
        const operatorMatch = alert.fail_cause.match(/(.*?)(\s*(?:!=|==|<|>)\s*)(.*)/);
        let formattedFailCause = alert.fail_cause;

        if (operatorMatch) {
          const [, left, operator, right] = operatorMatch;
          formattedFailCause = `<b>${left.trim()}</b>${operator}${right.trim()}`;
        }

        tableHtml += `
          <tr class="history-item">
            <td>${alert.alert_id}</td>
            <td>${alert.signal}</td>
            <td>${formattedFailCause}</td>
            <td>${alert.category + " (" + alert.can_message_id+ ")" || ''}</td>
            <td>${alert.can_message_data}</td>
            <td>${Math.trunc(alert.can_message_timestamp)}</td>
          </tr>
        `;
      });


      tableHtml += `
            </tbody>
          </table>
        </div>
      `;
      alertHistoryContainer.innerHTML = tableHtml;
    } else {
      alertHistoryContainer.innerHTML = `
        <div class="alert alert-info" role="alert">
          No alerts have been triggered yet.
        </div>
      `;
    }
  })
  .catch((error) => {
    console.error('Error fetching triggered alerts:', error);
  });
}

// Show "Category" for each active alert
function fetchAlerts() {
  fetch('/get_alerts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then((response) => response.json())
  .then((data) => {
    const activeAlertsContainer = document.getElementById('activeAlertsContainer');
    activeAlertsContainer.innerHTML = ''; // Clear previous alerts

    if (data.status === 'success' && data.alerts.length > 0) {
      data.alerts.forEach((alert) => {
        let comparisons = 'N/A';
        if (alert.comparisons_json) {
          try {
            const parsedComparisons = JSON.parse(alert.comparisons_json);
            comparisons = parsedComparisons
              .map((comp) => `${comp.operator} ${comp.value}`)
              .join(', ');
          } catch (e) {
            console.error('Error parsing comparisons_json:', e);
          }
        }

        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card p-3 mb-2';
        
        alertCard.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="mb-0">${alert.name || 'Untitled Alert'}</h5>
            <button class="btn btn-sm btn-danger delete-btn" onclick="deleteAlert('${alert.id}')">
              Delete
            </button>
          </div>
          <div class="row">
            <div class="col-md-12">
              <p class="mb-1"><strong>Category:</strong> ${alert.category || ''}</p>
              <p class="mb-1"><strong>Field:</strong> ${alert.field} (${alert.type})</p>
              <p class="mb-0"><strong>Condition:</strong> 
                ${alert.type === 'bool' ? alert.bool_value : comparisons}
              </p>
            </div>
          </div>
        `;
        
        activeAlertsContainer.appendChild(alertCard);
      });
    } else {
      activeAlertsContainer.innerHTML = `
        <div class="alert alert-info" role="alert">
          No active alerts found.
        </div>
      `;
    }
  })
  .catch((error) => {
    console.error('Error fetching alerts:', error);
  });
}

// Fetch alerts and triggered alerts on page load
document.addEventListener('DOMContentLoaded', () => {
  fetchAlerts();
  fetchTriggeredAlerts();
});

// Show modal when "Add Alert" button is clicked
document.getElementById("addAlertBtn").addEventListener("click", function () {
  // Reset step displays
  document.getElementById("step1").style.display = "block";
  document.getElementById("step2").style.display = "none";
  document.getElementById("backBtn").style.display = "none";
  document.getElementById("submitBtn").style.display = "none";
  document.getElementById("nextBtn").style.display = "inline-block";
  document.getElementById("boolOptions").style.display = "none";
  document.getElementById("numericOptions").style.display = "none";

  // Clear selected stuff
  selectedField = null;
  selectedFieldType = null;
  selectedCategory = null;
  document.getElementById("alertName").value = "";
  
  // Clear out the #radioGroup
  const radioGroup = document.getElementById("radioGroup");
  radioGroup.innerHTML = "";  

  // Show the modal
  $("#addAlertModal").modal("show");

  // Fetch parsed DBC fields from the server
  fetch("/parse_dbc_fields", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
  .then((response) => response.json())
  .then((data) => {
    // data.message => { "Battery": { "batteryVoltage": "double", ... }, "Motor": {...} }
    for (const [category, fields] of Object.entries(data.message)) {
      // Create a category label in the modal
      const categoryLabel = document.createElement("h5");
      categoryLabel.classList.add("mt-3");
      categoryLabel.innerText = category;
      radioGroup.appendChild(categoryLabel);

      // Fields under this category
      for (const [fieldKey, fieldLabel] of Object.entries(fields)) {
        const radioContainer = document.createElement("div");
        radioContainer.className = "form-check";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.className = "form-check-input";
        radio.id = fieldKey;
        radio.value = fieldKey;
        radio.name = "alertType";
        radio.dataset.type = fieldLabel;
        radio.dataset.category = category;

        const label = document.createElement("label");
        label.className = "form-check-label";
        label.htmlFor = fieldKey;
        label.innerText = `${fieldKey} (${fieldLabel})`;

        radioContainer.appendChild(radio);
        radioContainer.appendChild(label);
        radioGroup.appendChild(radioContainer);
      }
    }
  })
  .catch((error) => {
    console.error("Error fetching DBC fields:", error);
  });
});

// Next button: move from Step 1 to Step 2
document.getElementById("nextBtn").addEventListener("click", function () {
  const selectedRadio = document.querySelector('input[name="alertType"]:checked');
  if (!selectedRadio) {
    alert("Please select an alert type.");
    return;
  }
  selectedField = selectedRadio.value;
  selectedFieldType = selectedRadio.dataset.type;
  selectedCategory = selectedRadio.dataset.category;

  document.getElementById("selectedField").innerText = `Selected Field: ${selectedField}`;
  document.getElementById("step1").style.display = "none";
  document.getElementById("step2").style.display = "block";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("backBtn").style.display = "inline-block";
  document.getElementById("submitBtn").style.display = "inline-block";

  // Show or hide the bool/numeric panels
  if (selectedFieldType === "bool") {
    document.getElementById("boolOptions").style.display = "block";
    document.getElementById("numericOptions").style.display = "none";
  } else if (selectedFieldType === "int" || selectedFieldType === "double") {
    document.getElementById("boolOptions").style.display = "none";
    document.getElementById("numericOptions").style.display = "block";
  } else {
    document.getElementById("boolOptions").style.display = "none";
    document.getElementById("numericOptions").style.display = "none";
  }
});

// Back button: return to Step 1
document.getElementById("backBtn").addEventListener("click", function () {
  document.getElementById("step2").style.display = "none";
  document.getElementById("step1").style.display = "block";
  document.getElementById("nextBtn").style.display = "inline-block";
  document.getElementById("backBtn").style.display = "none";
  document.getElementById("submitBtn").style.display = "none";
});

// Submit button: send alert data to the server, including category
document.getElementById("submitBtn").addEventListener("click", function () {
  const alertName = document.getElementById("alertName").value.trim();
  if (!alertName) {
    alert("Please provide a name for this alert.");
    return;
  }

  let alertData = {
    name: alertName,
    field: selectedField,
    type: selectedFieldType,
    category: selectedCategory
  };

  if (selectedFieldType === "bool") {
    const boolVal = document.querySelector('input[name="boolValue"]:checked');
    if (!boolVal) {
      alert("Please select True or False.");
      return;
    }
    alertData.value = boolVal.value;
  } else if (selectedFieldType === "int" || selectedFieldType === "double") {
    const comparisons = [];

    const ltCheck = document.getElementById("lessThanCheck");
    const ltValue = document.getElementById("lessThanValue");
    if (ltCheck.checked && ltValue.value !== "") {
      comparisons.push({ operator: "<", value: ltValue.value });
    }

    const gtCheck = document.getElementById("greaterThanCheck");
    const gtValue = document.getElementById("greaterThanValue");
    if (gtCheck.checked && gtValue.value !== "") {
      comparisons.push({ operator: ">", value: gtValue.value });
    }

    const eqCheck = document.getElementById("equalCheck");
    const eqValue = document.getElementById("equalValue");
    if (eqCheck.checked && eqValue.value !== "") {
      comparisons.push({ operator: "==", value: eqValue.value });
    }

    const neCheck = document.getElementById("notEqualCheck");
    const neValue = document.getElementById("notEqualValue");
    if (neCheck.checked && neValue.value !== "") {
      comparisons.push({ operator: "!=", value: neValue.value });
    }

    if (comparisons.length === 0) {
      alert("Please select at least one comparison and enter a numeric value.");
      return;
    }
    alertData.comparisons = comparisons;
  }

  // Send the alert data to the server
  fetch("/create_alert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(alertData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === "success") {
      console.log("Alert created successfully:", data);
      $("#addAlertModal").modal("hide");
      fetchAlerts(); // Refresh the alerts display
    } else if (data.status === "error") {
      // Show error message to user
      alert("Error creating alert: " + data.message);
    }
  })
  .catch(error => {
    console.error("Error creating alert:", error);
    alert("Network error: Failed to create alert");
  });
});

// Optional: auto-refresh every 30 seconds
setInterval(() => {
  fetchAlerts();
  fetchTriggeredAlerts();
}, 30000);

