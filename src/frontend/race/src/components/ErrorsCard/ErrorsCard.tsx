import React from "react";
import "./ErrorsCard.css";

export default function ErrorsCard({ errors = []}) {
  return (
    <div className="card">
      <h3>Errors</h3>
      {(!errors || errors.length === 0) ? (
        <p>No errors</p>
      ) : (
        <ul className="error-list">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}