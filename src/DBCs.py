# The point of this file is to create DBCs once, instead of repeatedly being recreated whenever function is called
import cantools as ct

# DBC_FILES are the 'definition'/'configuration' files.
DBC_FILES = ["BPS.dbc", "MotorController.dbc", "MPPT.dbc", "Rivanna2.dbc"]

# DBCs takes the files from DBC_FILES and turns each file into a Object
# Function in our code depend on these definitions/configurations to run
DBCs = [ct.db.load_file(f"./src/CAN-messages/{file}") for file in DBC_FILES]