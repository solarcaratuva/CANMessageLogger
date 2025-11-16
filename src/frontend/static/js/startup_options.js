async function validateForm() {
    let isValid = true;
    const inputFileFieldset = document.getElementById('inputFileFieldset');
    const inputFile = document.getElementById('inputFile');
    const inputFileError = document.getElementById('inputFileError');
    const logTypeRadio = document.querySelector('input[name="logType"]:checked');
    const logType = logTypeRadio ? logTypeRadio.value : '';

    if (inputFileFieldset.style.display !== 'none') {
        // Required modes must have a file selected
        const requiredTypes = ['pastlog','db','mock_livelog'];
        if (requiredTypes.includes(logType)) {
            if (!inputFile.value || inputFile.value.trim().length === 0) {
                inputFileError.innerHTML = 'Please select a file';
                inputFileError.style.display = 'block';
                return false;
            }
        }
        if (inputFile.value && inputFile.value.trim().length > 0) {
            const filePath = inputFile.value.trim();
            try {
                const response = await fetch('/validate-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath, logType })
                });
                const result = await response.json();
                if (!result.valid) {
                    inputFileError.innerHTML = result.message;
                    inputFileError.style.display = 'block';
                    isValid = false;
                } else {
                    inputFileError.style.display = 'none';
                }
            } catch (err) {
                inputFileError.innerHTML = 'Could not validate file';
                inputFileError.style.display = 'block';
                isValid = false;
            }
        } else {
            inputFileError.style.display = 'none';
        }
    }
    
    // Validate output DB if provided
    const outputDB = document.getElementById('outputDB');
    const outputDBError = document.getElementById('outputDBError');
    
    if (outputDB.value.trim()) {
        const outputFileName = outputDB.value.trim().toLowerCase();
        if (!outputFileName.endsWith('.db')) {
            outputDBError.style.display = 'block';
            isValid = false;
        } else {
            outputDBError.style.display = 'none';
        }
    } else {
        outputDBError.style.display = 'none';
    }
    
    return isValid;
}

async function handleFormSubmit() {
    const launchButton = document.getElementById('launchButton');
    
    // Don't proceed if button is disabled
    if (launchButton.disabled) {
        return;
    }
    
    const isValid = await validateForm();
    if (isValid) {
        document.querySelector('form').submit();
    }
}

function updateLaunchButtonState(enabled, buttonText) {
    const launchButton = document.getElementById('launchButton');
    launchButton.disabled = !enabled;
    launchButton.textContent = buttonText;
    
    if (enabled) {
        launchButton.title = '';
    } else {
        launchButton.title = 'Hardware requirements not met';
    }
}

function updateInputFileState() {
    const logTypeRadio = document.querySelector('input[name="logType"]:checked');
    const logType = logTypeRadio ? logTypeRadio.value : '';
    const inputFileFieldset = document.getElementById('inputFileFieldset');
    const inputFile = document.getElementById('inputFile');
    const requiredLabel = document.getElementById('inputFileRequiredLabel');
    const inputFileError = document.getElementById('inputFileError');
    const hardwareStatusFieldset = document.getElementById('hardwareStatusFieldset');
    const requiredTypes = ['pastlog', 'db', 'mock_livelog'];
    
    if (requiredTypes.includes(logType)) {
        inputFileFieldset.style.display = '';
        inputFile.required = true;
        requiredLabel.style.display = '';
    } else {
        inputFileFieldset.style.display = 'none';
        inputFile.required = false;
        requiredLabel.style.display = 'none';
        // Clear any previous selection
        inputFile.value = '';
        inputFileError.style.display = 'none';
    }
    
    // Show hardware status for hardware-dependent modes
    if (logType === 'livelog' || logType === 'radio') {
        hardwareStatusFieldset.style.display = '';
        // Initially disable the button for hardware modes until validation completes
        updateLaunchButtonState(false, 'Checking hardware...');
        checkHardwareStatus(logType);
    } else {
        hardwareStatusFieldset.style.display = 'none';
        // Enable the button for non-hardware modes
        updateLaunchButtonState(true, 'Launch App');
    }
}

async function checkHardwareStatus(logType) {
    const statusDiv = document.getElementById('hardwareStatus');
    statusDiv.innerHTML = 'Checking hardware...';
    statusDiv.style.backgroundColor = '#f0f0f0';
    statusDiv.style.color = '#333';
    
    try {
        const response = await fetch('/validate-hardware', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ logType: logType })
        });
        
        const result = await response.json();
        
        if (result.valid) {
            statusDiv.innerHTML = `${result.message}`;
            statusDiv.style.backgroundColor = '#e8f5e8';
            statusDiv.style.color = '#2e7d32';
            // Enable launch button when hardware is found
            updateLaunchButtonState(true, 'Launch App');
        } else {
            statusDiv.innerHTML = `${result.message}`;
            statusDiv.style.backgroundColor = '#ffebee';
            statusDiv.style.color = '#d32f2f';
            // Disable launch button when hardware is not found
            updateLaunchButtonState(false, `Cannot launch - ${result.message}`);
        }
    } catch (error) {
        statusDiv.innerHTML = 'Could not check hardware status';
        statusDiv.style.backgroundColor = '#ffebee';
        statusDiv.style.color = '#d32f2f';
        // Disable launch button on error
        updateLaunchButtonState(false, 'Cannot launch - Hardware check failed');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize button as enabled for non-hardware modes
    updateLaunchButtonState(true, 'Launch App');
    updateInputFileState();
});

async function browseForFile() {
    const logTypeRadio = document.querySelector('input[name="logType"]:checked');
    const logType = logTypeRadio ? logTypeRadio.value : '';
    const inputFile = document.getElementById('inputFile');
    const inputFileError = document.getElementById('inputFileError');

    try {
        const response = await fetch('/browse-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logType })
        });
        const data = await response.json();
        if (data.success && data.path) {
            inputFile.value = data.path;
            inputFileError.style.display = 'none';
        } else if (data.message) {
            inputFileError.innerHTML = data.message;
            inputFileError.style.display = 'block';
        }
    } catch (err) {
        inputFileError.innerHTML = 'Could not open file dialog';
        inputFileError.style.display = 'block';
    }
}

