import React from 'react';
import "./SpeedComponent.css"

const SpeedComponent = ({current, max, min, average}) => {
    return(
    <div>
        <div className="speed-component">
            <h2>SPEED</h2>
            <div className='speed-card speed-avg'>
                <p>Current</p>
                <h3>{current} mph</h3>
            </div>

                <div className='speedDisplay'>
                    <div className='speed-card speed-min'>
                        <p>Min Speed</p>
                        <h3>{min} mph</h3>
                    </div>

                <div className='speed-card speed-avg'>
                    <p>Average Speed</p>
                    <h3>{average} mph</h3>
                </div>

                <div className='speed-card speed-max'></div>
                    <p>Max Speed</p>
                    <h3>{max} mph</h3>
            </div>
        </div>
    </div>
    )
}

export default SpeedComponent;