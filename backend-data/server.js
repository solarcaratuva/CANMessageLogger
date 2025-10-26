const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());

// Simple endpoint to generate random dashcam data
app.get('/data', (req, res) => {
    const data = {
        speed: Math.floor(Math.random() * 200),      // 0-199 km/h
        rpm: Math.floor(Math.random() * 8000),       // 0-7999 rpm
        fuel: Math.floor(Math.random() * 100),       // 0-99 %
        temperature: Math.floor(Math.random() * 120) // 0-119 °C
    };
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


