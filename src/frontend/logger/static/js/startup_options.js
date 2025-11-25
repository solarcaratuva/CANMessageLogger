function validateForm() {
    let isValid = true;
    
    // Validate input file if visible
    const inputFileFieldset = document.getElementById('inputFileFieldset');
    const inputFile = document.getElementById('inputFile');
    const inputFileError = document.getElementById('inputFileError');
    
    if (inputFileFieldset.style.display !== 'none' && inputFile.value.trim()) {
        const inputFileName = inputFile.value.trim().toLowerCase();
        const validInputExtensions = ['.log', '.txt', '.db'];
        const hasValidInputExt = validInputExtensions.some(ext => inputFileName.endsWith(ext));
        
        if (!hasValidInputExt) {
            inputFileError.style.display = 'block';
            isValid = false;
        } else {
            inputFileError.style.display = 'none';
        }
    } else {
        inputFileError.style.display = 'none';
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

function updateInputFileState() {
    const logTypeRadio = document.querySelector('input[name="logType"]:checked');
    const logType = logTypeRadio ? logTypeRadio.value : '';
    const inputFileFieldset = document.getElementById('inputFileFieldset');
    const inputFile = document.getElementById('inputFile');
    const requiredLabel = document.getElementById('inputFileRequiredLabel');
    const inputFileError = document.getElementById('inputFileError');
    const requiredTypes = ['pastlog', 'db', 'mock_livelog'];
    
    if (requiredTypes.includes(logType)) {
        inputFileFieldset.style.display = '';
        inputFile.required = true;
        requiredLabel.style.display = '';
    } else {
        inputFileFieldset.style.display = 'none';
        inputFile.required = false;
        requiredLabel.style.display = 'none';
        inputFile.value = '';
        inputFileError.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', updateInputFileState);

