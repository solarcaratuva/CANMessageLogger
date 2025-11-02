import { useEffect, useState } from "react";

export default function Satus(){
    const[message, setMessage] = useState("")

    useEffect(() => {
        fetch("http://localhost:5500/api/test")
        .then((res) => res.json())
        .then((data) => setMessage(data.message))
        .catch((err) => console.error("Flask fetch error:", err));
    },[]);

    return(
        <div>
            <h1>
                Flask + React Integration Test
                <p>Message from backend: {message}</p>
            </h1>
        </div>
    );
}

