# The point of this file is to create DBCs once, instead of repeatedly being recreated whenever DbConnection is called
import cantools as ct

# DBC_FILES are the 'definitions'/'mappings' files, they are not parseable yet.
DBC_FILES = ["BPS.dbc", "MotorController.dbc", "MPPT.dbc", "Rivanna3.dbc"]

# DBCs takes the files from DBC_FILES and turns each file into a DBC Object that has functions to access can msg types
# Function in our code depend on these definitions/configurations to get information on each type of can message.
DBCs = [ct.db.load_file(f"./src/CAN-messages/{file}") for file in DBC_FILES]
