# CAN Message Logger
A program that plots the values of user selected CAN message components over time, as well as flagging any obvious errors or CAN errors. 

For help, see Colby, Alex, or Jimmy. Made for use by the UVA Solar Car Team. 


## Installation
Option 1: install the `.exe` (in releases, Windows only)

Option 2: clone this repo, create and activate a virtual environment, install dependencies from `requirements.txt`, run `main.py` 

## How to use
After starting the program, the user will be prompted to enter "serial" or enter the path of a CAN message log file (`.txt`). If the serial connection can't be established, or the file doesn't exist, the user will be prompted to try again. When the serial connection is established, or the log file's data is imported, the user will be notified and will be able to enter commands.

## Commands
- `add [name]` to create a graph for the named item
- `add [name] [startTime] [endTime]` to create a static graph that starts and ends at a certain time
- `rm [name]` to delete a shown graph for the named item
- `log [filepath]` logs all CAN messages in a file at the path
- `quit` exits the program
Note that `[name]` **must** be a tracked value

## Tracked values
**BPS:** pack_voltage, pack_current, pack_soc, low_cell_voltage, high_cell_voltage, low_temperature, high_temperature

**MotorController:** battery_voltage, battery_current, battery_current_direction, motor_current, fet_temp, motor_rpm, pwm_duty, lead_angle, power_mode, control_mode, accelerator_vr_position, regen_vr_position, digital_sw_position, output_target_value, motor_status, regen_status

**Rivanna2:** throttle, regen, cruise_control_speed, cruise_control_en, forward_en, reverse_en, motor_on, hazards, brake_lights, headlights, left_turn_signal, right_turn_signal, total_current, panel1_voltage, panel2_voltage, panel3_voltage, panel4_voltage, panel1_temp, panel2_temp, panel3_temp, panel4_temp
