// Global variables
let signatureImageData = null;
let selectedFile = null;
let currentRotation = 0;
let cropper = null;

// Expose a setter so firebase-auth can set the signature image when loading from Firestore
window.setSignatureImageData = function(dataUrl) {
    signatureImageData = dataUrl;
    const preview = document.getElementById('signaturePreview');
    const placeholder = document.getElementById('signaturePlaceholder');
    
    if (preview && dataUrl) {
        preview.src = dataUrl;
        preview.classList.remove('hidden');
        preview.style.display = 'block';
        preview.style.visibility = 'visible';
        
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        console.log('Preview updated with signature');
    } else {
        console.warn('Preview element not found or no data URL provided');
    }
};

// DOM elements
const form = document.getElementById('consentForm');
const loading = document.getElementById('loading');
const signatureInput = document.getElementById('signature');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    document.getElementById('date').valueAsDate = new Date();
    
    // Add form submission handler
    form.addEventListener('submit', handleFormSubmit);
    
    // Add signature upload handler
    // ensure the file input is not required (we validate via signatureImageData)
    if (signatureInput) {
        signatureInput.removeAttribute('required');
        signatureInput.addEventListener('change', handleFileSelection);
    }
    
    // Add upload button handler
    document.getElementById('uploadSignatureBtn').addEventListener('click', showImageEditor);
    
    // Add signature editor modal handlers
    document.getElementById('closeSignatureModal').addEventListener('click', closeSignatureEditor);
    document.getElementById('cancelSignatureEdit').addEventListener('click', closeSignatureEditor);
    document.getElementById('applySignatureEdit').addEventListener('click', processAndUploadSignature);
    document.getElementById('rotateLeftBtn').addEventListener('click', () => rotateSignature(-90));
    document.getElementById('rotateRightBtn').addEventListener('click', () => rotateSignature(90));
    document.getElementById('resetCropBtn').addEventListener('click', resetSignatureCrop);
    
    // Close modal when clicking overlay
    document.querySelector('.signature-modal-overlay').addEventListener('click', closeSignatureEditor);
    
    // Add apply for leave button handler
    document.getElementById('applyLeave').addEventListener('click', function() {
        window.open('https://academic.bits-pilani.ac.in/', '_blank');
    });
});

// Handle file selection (show upload button)
function handleFileSelection(event) {
    const file = event.target.files[0];
    const uploadBtn = document.getElementById('uploadSignatureBtn');
    
    if (file) {
        selectedFile = file;
        uploadBtn.classList.remove('hidden');
        uploadBtn.style.display = 'inline-block';
    } else {
        selectedFile = null;
        uploadBtn.classList.add('hidden');
        uploadBtn.style.display = 'none';
    }
}

// Show signature editor modal
function showImageEditor() {
    if (!selectedFile) return;
    
    const modal = document.getElementById('signatureEditorModal');
    const editImage = document.getElementById('signatureEditImage');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        editImage.src = e.target.result;
        modal.classList.add('active');
        
        // Initialize cropper after image loads
        editImage.onload = function() {
            initializeSignatureCropper();
        };
    };
    reader.readAsDataURL(selectedFile);
}

// Initialize signature cropper (using Cropper.js library)
function initializeSignatureCropper() {
    // Destroy existing cropper if any
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    const editImage = document.getElementById('signatureEditImage');
    currentRotation = 0;
    
    // Initialize Cropper.js with improved settings
    cropper = new Cropper(editImage, {
        aspectRatio: NaN, // Free aspect ratio
        viewMode: 2,
        autoCropArea: 0.95,
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        background: true,
        modal: false,
        scalable: true,
        zoomable: true,
        rotatable: true,
        checkOrientation: false,
        dragMode: 'move',
        minContainerWidth: 300,
        minContainerHeight: 200
    });
}

// Rotate signature
function rotateSignature(degrees) {
    if (cropper) {
        cropper.rotate(degrees);
        currentRotation += degrees;
    }
}

// Reset signature crop
function resetSignatureCrop() {
    if (cropper) {
        cropper.reset();
        currentRotation = 0;
    }
}



// Close signature editor
function closeSignatureEditor() {
    const modal = document.getElementById('signatureEditorModal');
    modal.classList.remove('active');
    
    // Small delay to allow animation to complete
    setTimeout(() => {
        // Destroy cropper instance
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        
        // Reset file input and hide upload button
        const signatureInput = document.getElementById('signature');
        const uploadBtn = document.getElementById('uploadSignatureBtn');
        
        if (signatureInput) {
            signatureInput.value = '';
        }
        
        if (uploadBtn) {
            uploadBtn.classList.add('hidden');
        }
        
        selectedFile = null;
        currentRotation = 0;
    }, 300);
}

// Process and upload the edited signature
function processAndUploadSignature() {
    if (!cropper) {
        console.error('Cropper not initialized');
        return;
    }
    
    // Get the cropped canvas with fixed height - width will adjust automatically
    const FIXED_HEIGHT = 120; // Fixed height for signature
    
    const canvas = cropper.getCroppedCanvas({
        height: FIXED_HEIGHT,
        fillColor: '#ffffff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    
    if (!canvas) {
        console.error('Failed to get cropped canvas');
        return;
    }
    
    console.log(`Processed signature: ${canvas.width}x${canvas.height}px (natural aspect ratio preserved)`);
    
    // Get the processed image as data URL
    const processedImageData = canvas.toDataURL('image/png', 0.9);
    
    // Try to remove background using remove.bg API
    canvas.toBlob(function(blob) {
        const processedFile = new File([blob], selectedFile.name, { type: 'image/png' });
        
        removeBackground(processedFile)
            .then(finalImage => {
                // Use background-removed image if successful
                signatureImageData = finalImage;
                updateSignaturePreview(finalImage);
                closeSignatureEditor();
                console.log('Background removed and preview updated');
            })
            .catch(error => {
                // Fallback to processed image if API fails
                console.log('Background removal failed, using processed image:', error);
                signatureImageData = processedImageData;
                updateSignaturePreview(processedImageData);
                closeSignatureEditor();
            });
    }, 'image/png', 0.9);
}

// Update signature preview
function updateSignaturePreview(imageData) {
    const preview = document.getElementById('signaturePreview');
    const placeholder = document.getElementById('signaturePlaceholder');
    const uploadBtn = document.getElementById('uploadSignatureBtn');
    
    if (preview && imageData) {
        preview.src = imageData;
        preview.classList.remove('hidden');
        preview.style.display = 'block';
        preview.style.visibility = 'visible';
        
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Hide upload button after successful upload
        uploadBtn.classList.add('hidden');
        uploadBtn.style.display = 'none';
    }
}

// Remove background using remove.bg API with Firebase key management
async function removeBackground(imageFile) {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');
    
    try {
        // Get available API key from Firebase
        const apiKeyInfo = await window.firebaseGetAvailableApiKey();
        
        if (!apiKeyInfo) {
            throw new Error('No available API keys - all have reached monthly limit');
        }
        
        console.log('Using API key for background removal:', apiKeyInfo.id);
        
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKeyInfo.apiKey
            },
            body: formData
        });
        
        if (response.ok) {
            // Increment usage count for this API key
            await window.firebaseIncrementApiKeyUsage(apiKeyInfo.id);
            
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } else {
            throw new Error(`API request failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Background removal error:', error);
        throw error;
    }
}

// Handle form submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Show loading
    loading.classList.remove('hidden');
    
    // Generate PDF after a short delay to show loading
    setTimeout(() => {
        generatePDF();
        loading.classList.add('hidden');
    }, 500);
}

// Validate form
function validateForm() {
    const requiredFields = [
        'studentName', 'studentId', 'bhawan', 'leaveFrom', 'leaveTo', 
        'parentName', 'place', 'date', 'mobile'
    ];
    
    for (let field of requiredFields) {
        const element = document.getElementById(field);
        if (!element.value.trim()) {
            alert(`Please fill in the ${element.previousElementSibling.textContent}`);
            element.focus();
            return false;
        }
    }
    
    // Validate mobile number
    const mobile = document.getElementById('mobile').value;
    if (!/^\d{10}$/.test(mobile)) {
        alert('Please enter a valid 10-digit mobile number');
        document.getElementById('mobile').focus();
        return false;
    }
    
    // Validate signature upload
    if (!signatureImageData) {
        alert('Please upload a signature image');
        signatureInput.focus();
        return false;
    }
    
    // Validate dates
    const leaveFrom = new Date(document.getElementById('leaveFrom').value);
    const leaveTo = new Date(document.getElementById('leaveTo').value);
    
    if (leaveTo < leaveFrom) {
        alert('Leave "To" date must be after "From" date');
        document.getElementById('leaveTo').focus();
        return false;
    }
    
    return true;
}

// Generate PDF
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Get form data
    const formData = {
        studentName: document.getElementById('studentName').value,
        studentId: document.getElementById('studentId').value,
        bhawan: document.getElementById('bhawan').value,
        leaveFrom: formatDateShort(document.getElementById('leaveFrom').value),
        leaveTo: formatDateShort(document.getElementById('leaveTo').value),
        parentName: document.getElementById('parentName').value,
        place: document.getElementById('place').value,
        date: formatDateShort(document.getElementById('date').value),
        mobile: document.getElementById('mobile').value
    };
    
    // Set default font to Times
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    
    // Title with underline
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    const titleText = "Parent's Consent Form";
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, 105, 25, { align: 'center' });
    doc.line(105 - titleWidth/2, 27, 105 + titleWidth/2, 27); // Underline title
    
    // Reset font for body text
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    
    // Header section with minimal spacing
    doc.text("To", 25, 45);
    doc.text("The Warden", 25, 50);
    
    // Bhawan with reduced-width underline closer to text
    doc.text(`${formData.bhawan}`, 25, 55);
    doc.line(25, 56, 45, 56); // Further reduced width underline
    doc.text("Bhawan", 50, 55);
    
    doc.text("BITS Pilani, Pilani Campus", 25, 60);
    doc.text("Dear Madam/Sir,", 25, 70);
    
    // Main content with minimal spacing
    let yPos = 80;
    
    // First line with reduced-width underlines closer to text
    doc.text("I, mother/father of", 25, yPos);
    const nameStartX = 25 + doc.getTextWidth("I, mother/father of ");
    doc.text(formData.studentName, nameStartX, yPos);
    doc.line(nameStartX, yPos + 1, nameStartX + 40, yPos + 1); // Further reduced width
    
    const bearingStartX = nameStartX + 45;
    doc.text("bearing ID Number", bearingStartX, yPos);
    
    const idStartX = bearingStartX + doc.getTextWidth("bearing ID Number ");
    doc.text(formData.studentId, idStartX, yPos);
    doc.line(idStartX, yPos + 1, idStartX + 40, yPos + 1); // Further reduced width
    
    // doc.text(",", idStartX + 45, yPos);
    
    // Second line with reduced-width underlines closer to text
    yPos += 7; 
    doc.text("am aware of my child applying for leave from", 25, yPos);
    const fromDateStartX = 25 + doc.getTextWidth("am aware of my child applying for leave from ");
    doc.text(formData.leaveFrom, fromDateStartX, yPos);
    doc.line(fromDateStartX, yPos + 1, fromDateStartX + 35, yPos + 1); // Further reduced width
    
    const toStartX = fromDateStartX + 40;
    doc.text("to", toStartX, yPos);
    
    const toDateStartX = toStartX + doc.getTextWidth("to ");
    doc.text(formData.leaveTo, toDateStartX, yPos);
    doc.line(toDateStartX, yPos + 1, toDateStartX + 35, yPos + 1); // Further reduced width
    
    // doc.text(".", toDateStartX + 40, yPos);
    
    // Third line - minimal spacing
    yPos += 7; 
    doc.text("Kindly grant her/him leave for the above-mentioned time period.", 25, yPos);
    
    // Fourth line - minimal spacing
    yPos += 12; 
    doc.text("I understand that this leave is granted with the assumption that my child is solely responsible for all", 25, yPos);
    
    // Fifth line - minimal spacing
    yPos += 7; 
    doc.text("the academic assignments of the respective courses that s/he is currently enrolled in.", 25, yPos);
    
    // Thank you - minimal spacing
    yPos += 12; 
    doc.text("Thanking You,", 25, yPos);
    
    // Signature section - minimal spacing
    yPos += 20; 
    if (signatureImageData) {
        // Create a temporary image to get natural dimensions
        const tempImg = new Image();
        tempImg.onload = function() {
            const naturalWidth = this.naturalWidth;
            const naturalHeight = this.naturalHeight;
            const aspectRatio = naturalWidth / naturalHeight;
            
            // Set fixed height for PDF and calculate proportional width
            const pdfHeight = 18;
            const pdfWidth = pdfHeight * aspectRatio;
            
            doc.addImage(signatureImageData, 'PNG', 25, yPos - 20, pdfWidth, pdfHeight);
            
            // Continue with the rest of the PDF generation
            finalizePDF();
        };
        tempImg.src = signatureImageData;
    } else {
        finalizePDF();
    }
    
    function finalizePDF() {
        doc.line(25, yPos, 85, yPos); // Signature line
        yPos += 5; 
        doc.text("(Signature)", 25, yPos);
        
        // Bottom section without underlines
        yPos += 12; 
        doc.text("Full Name:", 25, yPos);
        const fullNameX = 25 + doc.getTextWidth("Full Name: ");
        doc.text(formData.parentName, fullNameX, yPos);
        
        yPos += 7; 
        doc.text("Place:", 25, yPos);
        const placeX = 25 + doc.getTextWidth("Place: ");
        doc.text(formData.place, placeX, yPos);
        
        // Date on the right side without underline
        const dateX = 140;
        doc.text("Date:", dateX, yPos);
        const dateValueX = dateX + doc.getTextWidth("Date: ");
        doc.text(formData.date, dateValueX, yPos);
        
        yPos += 7; 
        doc.text("Mobile Number:", 25, yPos);
        const mobileX = 25 + doc.getTextWidth("Mobile Number: ");
        doc.text(formData.mobile, mobileX, yPos);
        
        // Save the PDF with new filename format
        const currentDate = new Date();
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = months[currentDate.getMonth()].toLowerCase();
        const fileName = `${formData.studentId}_${day}${month}.pdf`;
        doc.save(fileName);
        
        // Try saving the user's last-filled data (if signed in)
        try {
            const currentUser = window.firebaseGetCurrentUser ? window.firebaseGetCurrentUser() : null;
            if (currentUser && currentUser.email && window.firebaseSaveUserLeaveData) {
                const toSave = {
                    studentName: document.getElementById('studentName').value,
                    studentId: document.getElementById('studentId').value,
                    bhawan: document.getElementById('bhawan').value,
                    leaveFrom: document.getElementById('leaveFrom').value,
                    leaveTo: document.getElementById('leaveTo').value,
                    parentName: document.getElementById('parentName').value,
                    place: document.getElementById('place').value,
                    date: document.getElementById('date').value,
                    mobile: document.getElementById('mobile').value,
                    signatureDataUrl: signatureImageData || null,
                    updatedAt: new Date().toISOString()
                };

                window.firebaseSaveUserLeaveData(currentUser.email, toSave)
                    .then(() => console.info('Saved user leave data for', currentUser.email))
                    .catch(err => console.warn('Failed to save user leave data', err));
            }
        } catch (e) {
            console.error('Error while attempting to save user data:', e);
        }

        // Show success message
        showSuccessMessage(fileName);
    }
}

// Format date to short format (DD MMM YYYY)
function formatDateShort(dateString) {
    const date = new Date(dateString);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                   'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Show success message
function showSuccessMessage(fileName) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #27ae60;
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    message.innerHTML = `
        <div style="margin-bottom: 10px;">✅ PDF Generated Successfully!</div>
        <div style="font-size: 14px; font-weight: normal;">${fileName} has been downloaded</div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Reset form handler
document.getElementById('resetForm').addEventListener('click', function() {
    signatureImageData = null;
    selectedFile = null;
    currentRotation = 0;
    document.getElementById('date').valueAsDate = new Date();
    
    // clear file input and hide preview
    if (signatureInput) {
        signatureInput.value = '';
    }
    
    const preview = document.getElementById('signaturePreview');
    const placeholder = document.getElementById('signaturePlaceholder');
    const uploadBtn = document.getElementById('uploadSignatureBtn');
    
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
        preview.style.display = 'none';
        preview.style.visibility = 'hidden';
    }
    
    if (placeholder) {
        placeholder.style.display = 'block';
    }
    
    if (uploadBtn) {
        uploadBtn.classList.add('hidden');
        uploadBtn.style.display = 'none';
    }
    
    console.log('Form reset, preview cleared');
});

// Admin function to initialize API keys (call this once in browser console)
window.initRemoveBgApiKeys = async function(apiKeys) {
    if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
        console.error('Please provide an array of API keys');
        return;
    }
    
    try {
        await window.firebaseInitializeApiKeys(apiKeys);
        console.log('✅ API keys initialized successfully!');
        console.log('Keys added:', apiKeys.length);
    } catch (error) {
        console.error('❌ Failed to initialize API keys:', error);
    }
};

// Admin function to check API key status
window.checkApiKeyStatus = async function() {
    try {
        const keyInfo = await window.firebaseGetAvailableApiKey();
        if (keyInfo) {
            console.log('✅ Available API key found:');
            console.log(`Key ID: ${keyInfo.id}`);
            console.log(`Usage this month: ${keyInfo.usageThisMonth}/45`);
        } else {
            console.log('❌ No available API keys (all at limit)');
        }
    } catch (error) {
        console.error('Error checking API key status:', error);
    }
};