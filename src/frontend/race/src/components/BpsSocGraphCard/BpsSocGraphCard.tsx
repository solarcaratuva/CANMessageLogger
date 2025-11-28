import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Label } from 'recharts';
import './BpsSocGraphCard.css'


const data = [
  {
    name: '10AM',
    uv: 100,
    pv: 2400,
    amt: 2400,
  },
  {
    name: '12PM',
    uv: 87,
    pv: 1398,
    amt: 2210,
  },
  {
    name: '2PM',
    uv: 92,
    pv: 9800,
    amt: 2290,
  },
  {
    name: '4PM',
    uv: 89,
    pv: 3908,
    amt: 2000,
  },
  {
    name: '6PM',
    uv: 79,
    pv: 4800,
    amt: 2181,
  },
  {
    name: '8PM',
    uv: 45,
    pv: 3800,
    amt: 2500,
  },
  {
    name: '10PM',
    uv: 23,
    pv: 4300,
    amt: 2100,
  },
];


function BpsSocGraphCard() {
    return (
        <div className="card">
            <h3 className="card-title">BPS SoC Over Time</h3>
            <AreaChart
            style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618, }}
            responsive
            data={data}
            margin={{
                top: 20,
                right: 0,
                left: 0,
                bottom: 20,
            }}
            >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis  dataKey="name" stroke="#ffffff">
                <Label
                    value="Time"
                    position="insideBottom"
                    offset={-15}   
                    style={{ fill: "#ffffff", fontSize: 12 }}
                />
            </XAxis>
            <YAxis
                stroke="#ffffff"
                tick={{ fill: "#ffffff", fontSize: 12 }}
                >
                <Label
                    value="State of Charge (%)"
                    angle={-90}      
                    position="insideLeft"
                    style={{ fill: "#ffffff", fontSize: 12 }}
                />
                </YAxis>
            <Tooltip />
            <Area type="monotone" dataKey="uv" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
        </div>
    
  );
}

export default BpsSocGraphCard;