import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Payment() {

  const colors = useSelector((state) => state.theme.colors);
  const [searchParams] = useSearchParams();

  const amount = searchParams.get("amount");
  const orderId = searchParams.get("orderId");
  const companyId = searchParams.get("companyId");

  const [merchantId, setMerchantId] = useState(null);
  const [hash, setHash] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Load PayHere SDK
  useEffect(() => {

    const script = document.createElement("script");
    script.src = "https://www.payhere.lk/lib/payhere.js";
    script.async = true;

    script.onload = () => {
      setSdkLoaded(true);
      console.log("PayHere SDK Loaded");
    };

    document.body.appendChild(script);

  }, []);

  // Get hash + merchant id
  useEffect(() => {

    async function fetchHash() {

      try {

        const res = await axios.get(
          `http://localhost:8000/payhere/generate-hash/${companyId}/${orderId}/${amount}`
        );

        console.log("Hash response:", res.data);

        setMerchantId(res.data.data.merchant_id);
        setHash(res.data.data.hash);

      } catch (error) {

        console.error("Failed to fetch hash:", error);

      }
    }

    if (companyId && orderId && amount) {
      fetchHash();
    }

  }, [companyId, orderId, amount]);



  const startPayment = () => {

    if (!sdkLoaded) {
      alert("PayHere SDK not loaded yet");
      return;
    }

    if (!merchantId || !hash) {
      alert("Payment information not ready");
      return;
    }

    const payment = {

      sandbox: true,

      merchant_id: merchantId,

      return_url: "http://localhost:5173/payment-success",
      cancel_url: "http://localhost:5173/payment-cancel",
      notify_url: "http://localhost:8000/payhere/notify",

      order_id: orderId,
      items: "Chatbot Service",

      amount: amount,
      currency: "LKR",

      hash: hash,

      first_name: "Saman",
      last_name: "Perera",
      email: "test@gmail.com",
      phone: "0771234567",
      address: "No.1, Galle Road",
      city: "Colombo",
      country: "Sri Lanka"

    };



    window.payhere.onCompleted = function (orderId) {

      console.log("Payment completed. OrderID:", orderId);
      alert("Payment completed successfully");

    };

    window.payhere.onDismissed = function () {

      console.log("Payment popup dismissed");

    };

    window.payhere.onError = function (error) {

      console.log("PayHere Error:", error);
      alert("Payment error: " + error);

    };

    console.log("Starting payment:", payment);

    window.payhere.startPayment(payment);

  };



  return (

    <div style={{ padding: "40px" }}>

      <h2>Payment Page</h2>

      <p>Amount: {amount}</p>
      <p>Order ID: {orderId}</p>
      <p>Company ID: {companyId}</p>

      <button
        onClick={startPayment}
        disabled={!sdkLoaded || !hash}
        style={{
          padding: "12px 20px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          cursor: "pointer",
          marginTop: "20px"
        }}
      >
        Pay Here
      </button>

    </div>

  );

}