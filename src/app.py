from flask import Flask, render_template
import backend.db_access as db_access

app = Flask(__name__, template_folder='html')

@app.route('/')
def index():
    # Fetch data from the database
    data = db_access.get_test_motor_data()
    # Render the HTML with the large_data passed in
    return render_template('debug.html', large_data=data)

if __name__ == '__main__':
    app.run(debug=True)