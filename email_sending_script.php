<?php
// This script handles the form submission and sends an email.

// Check if the form was submitted using the POST method
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Sanitize and retrieve form data
    $name = strip_tags(trim($_POST["name"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $message = trim($_POST["message"]);

    // Basic validation: check if fields are empty or email is invalid
    if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // Send a 400 Bad Request response if validation fails
        http_response_code(400);
        echo "Please fill out all fields and provide a valid email address.";
        exit;
    }

    // --- CONFIGURATION ---
    // Set the recipient email address
    $recipient = "anna@liutenko.onmicrosoft.com";

    // Set the email subject
    $subject = "New message from your website by $name";
    // --- END CONFIGURATION ---

    // Build the email content
    $email_content = "Name: $name\n";
    $email_content .= "Email: $email\n\n";
    $email_content .= "Message:\n$message\n";

    // Build the email headers
    // Using an email from your own domain in the "From" header is best practice to avoid spam filters.
    $email_headers = "From: no-reply@anna.floripa.br\r\n";
    $email_headers .= "Reply-To: $email\r\n";
    $email_headers .= "X-Mailer: PHP/" . phpversion();

    // Try to send the email using PHP's mail() function
    if (mail($recipient, $subject, $email_content, $email_headers)) {
        // If successful, send a 200 OK response
        http_response_code(200);
        echo "Thank you! Your message has been sent.";
    } else {
        // If it fails, send a 500 Internal Server Error response
        http_response_code(500);
        echo "Oops! Something went wrong, and we couldn't send your message.";
    }

} else {
    // If someone tries to access this file directly, send a 403 Forbidden response
    http_response_code(403);
    echo "There was a problem with your submission, please try again.";
}
?>
