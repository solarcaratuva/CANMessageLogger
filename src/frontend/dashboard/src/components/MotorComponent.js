import "./MotorComponent.css"

const MotorComponent = ({breaking, cruise, manual, throttlePedal, brakePedal, throttle, motorRPM,}) =>{
    
    {/* Translate motorCommand values to data to be displayed */}
    {(cruise) ? cruise = "ON" : cruise = "OFF"};
    {(breaking) ? breaking = "ON" : breaking = "OFF"};
    {(manual) ? manual = "ON" : manual = "OFF"};

    return(
        <div>
            <div className='motor-component'>
                <div className='motor-card braking'>
                    <h2>
                        Breaking: {breaking}
                    </h2>
                </div>
                <div className='motor-card manual-versus-cruise'>
                    <h2>
                       Manual: {manual} <br />
                       Cruise: {cruise}
                    </h2>
                </div>
                <div className='motor-card peddals'>
                    <h2>
                        Throttle Pedal: {throttlePedal} <br />
                        Brake Pedal: {brakePedal}
                    </h2>
                </div>
                <div className='motor-card rpm_throttle'>
                    Motor RPM: {motorRPM} <br />
                    Throttle: {throttle}
                </div>
            </div>
        </div>
    )
}

export default MotorComponent;