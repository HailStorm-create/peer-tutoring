// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Subject data for the app
const subjectData = {
  english: [
    'English 9/English 9 Honors',
    'English 10/English 10 Honors',
    'English 11 CP',
    'AP English Language',
    'English 12 CP',
    'AP English Literature'
  ],
  history: [
    'World History/AP World History',
    'United States History/AP United States History',
    'Economics/AP Economics',
    'US Government/AP US Government',
    'AP European History',
    'AP Art History'
  ],
  math: [
    'Integrated Math 1/Integrated Math 1 Honors',
    'Integrated Math 2/Integrated Math 2 Honors',
    'Integrated Math 3/Integrated Math 3 Honors',
    'AP Calculus AB',
    'AP Calculus BC',
    'Calculus III/Linear Algebra',
    'Statistics/AP Statistics'
  ],
  science: [
    'CP Biology',
    'AP Biology',
    'CP Chemistry',
    'Honors Chemistry',
    'AP Chemistry',
    'CP Physics',
    'AP Physics 1',
    'AP Physics 2',
    'AP Physics C: Mechanics',
    'AP Physics C: E/M',
    'Anatomy and Physiology',
    'AP Environmental Science',
    'Biotech 1',
    'Biotech 2',
    'Psychology/AP Psychology'
  ],
  other: [
    'AP Computer Science Principles',
    'AP Computer Science A',
    'Principles of Engineering'
  ],
  languages: [
    'American Sign Language',
    'Spanish',
    'French',
    'Japanese',
    'Chinese'
  ]
};

// Google Sheets Configuration
const SPREADSHEET_ID = '1fXWwREQpzvMK5gWbpn_iB0mG1x--G4S_QAf9uZgVPVQ';
const SHEET_NAME = 'Bookings';

// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBJtoUKftblVe4VbunzRXe0i6KUfTfu5sI",
  authDomain: "peer-tutoring-7626d.firebaseapp.com",
  projectId: "peer-tutoring-7626d",
  storageBucket: "peer-tutoring-7626d.firebasestorage.app",
  messagingSenderId: "550956398073",
  appId: "1:550956398073:web:f2edb2580ac6315cb63928",
  measurementId: "G-RB688T36TY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Global state
let currentUser = null;
let allTutors = [];

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const setupScreen = document.getElementById('setupScreen');
const appScreen = document.getElementById('appScreen');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const googleSignIn = document.getElementById('googleSignIn');
const tutorSetupForm = document.getElementById('tutorSetupForm');
const bookingModal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');
const subjectSearch = document.getElementById('subjectSearch');
const tutorCards = document.getElementById('tutorCards');
const myRequests = document.getElementById('myRequests');
const profileInfo = document.getElementById('profileInfo');
const editProfileBtn = document.getElementById('editProfileBtn');
const headerUserName = document.getElementById('headerUserName');

// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load tab-specific content
    switch(tabName) {
        case 'booking':
            loadTutors();
            break;
        case 'myrequests':
            loadMyRequests();
            break;
        case 'myslots':
            loadMySlots();
            break;
        case 'events':
            loadEvents();
            break;
        case 'stats':
            loadStats();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// Authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // Show user name in header
        if (headerUserName) {
            headerUserName.textContent = user.displayName || 'Student';
            headerUserName.style.display = 'inline';
        }
        
        // Check if user has a profile
        const userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
            showSetupScreen();
        } else {
            showAppScreen();
        }
    } else {
        currentUser = null;
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        
        // Hide user name in header
        if (headerUserName) {
            headerUserName.style.display = 'none';
        }
        
        showLoginScreen();
    }
});

// Login/Logout
loginBtn.addEventListener('click', signInWithGoogle);
googleSignIn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', () => signOut(auth));

async function signInWithGoogle() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error signing in:', error);
        showMessage('Error signing in. Please try again.', 'error');
    }
}

// Screen management
function showLoginScreen() {
    loginScreen.style.display = 'block';
    setupScreen.style.display = 'none';
    appScreen.style.display = 'none';
}

function showSetupScreen() {
    loginScreen.style.display = 'none';
    setupScreen.style.display = 'block';
    appScreen.style.display = 'none';
    
    // Pre-fill name from Google account
    if (currentUser) {
        document.getElementById('tutorName').value = currentUser.displayName || '';
    }
}

function showAppScreen() {
    loginScreen.style.display = 'none';
    setupScreen.style.display = 'none';
    appScreen.style.display = 'block';
    
    // Update tab visibility and load default tab content
    updateTabVisibility();
    loadTutors();
}

// User profile management
async function getUserProfile(userId) {
    try {
        const docRef = doc(db, 'tutors', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

// Tutor setup form
tutorSetupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    // Validate profile picture is uploaded
    const profilePictureInput = document.getElementById('profilePicture');
    if (!profilePictureInput.files[0]) {
        showMessage('Please upload a profile picture that meets the requirements', 'error');
        return;
    }
    
    // Validate profile picture meets requirements
    const file = profilePictureInput.files[0];
    if (!await validateProfilePicture(file)) {
        return; // Error message shown in validation function
    }
    
    const selectedSubjects = Array.from(document.querySelectorAll('.subject-checkbox:checked'))
        .map(cb => cb.value);
    
    const isTutor = document.getElementById('isTutorCheckbox').checked;
    
    let profilePictureUrl = '';
    try {
        // Upload profile picture to Firebase Storage
        profilePictureUrl = await uploadProfilePicture(file);
    } catch (error) {
        showMessage('Error uploading profile picture. Please try again.', 'error');
        return;
    }
    
    const tutorData = {
        userId: currentUser.uid,
        name: document.getElementById('tutorName').value,
        email: currentUser.email,
        grade: document.getElementById('tutorGrade').value,
        subjects: selectedSubjects,
        bio: document.getElementById('tutorBio').value,
        availability: document.getElementById('tutorAvailability').value,
        profilePicture: profilePictureUrl,
        isTutor: isTutor,
        createdAt: Timestamp.now()
    };
    
    try {
        await setDoc(doc(db, 'tutors', currentUser.uid), tutorData);
        showMessage('Profile created successfully!', 'success');
        showAppScreen();
    } catch (error) {
        console.error('Error creating profile:', error);
        showMessage('Error creating profile. Please try again.', 'error');
    }
});

// Profile picture handling functions
async function uploadProfilePicture(file) {
    if (!currentUser) throw new Error('No authenticated user');
    
    // For now, use a placeholder URL until Firebase Storage is properly configured
    // In production, you would need to set up proper CORS and storage rules
    const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&size=200&background=dc2626&color=fff`;
    
    console.log('Using placeholder profile picture URL:', placeholderUrl);
    return placeholderUrl;
}

async function validateProfilePicture(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Profile picture must be less than 5MB', 'error');
        return false;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showMessage('Please upload a valid image file', 'error');
        return false;
    }
    
    // Additional validation could include face detection here
    // For now, we'll rely on user compliance with written requirements
    
    return true;
}

// Profile picture preview functionality
document.getElementById('profilePicture').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('profilePicturePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
});

// Load and display tutors
async function loadTutors() {
    try {
        tutorCards.innerHTML = '<div class="loading"></div>';
        
        const querySnapshot = await getDocs(collection(db, 'tutors'));
        allTutors = [];
        
        querySnapshot.forEach((doc) => {
            const tutorData = { id: doc.id, ...doc.data() };
            // Only show tutors who want to be tutors and are not the current user
            if (currentUser && tutorData.userId !== currentUser.uid && tutorData.isTutor !== false) {
                allTutors.push(tutorData);
            }
        });
        
        displayTutors(allTutors);
        
        // Refresh autocomplete data after loading tutors
        setupAutocompleteFields();
    } catch (error) {
        console.error('Error loading tutors:', error);
        tutorCards.innerHTML = '<div class="empty-state"><h3>Error loading tutors</h3><p>Please try again later.</p></div>';
    }
}

function displayTutors(tutors) {
    if (tutors.length === 0) {
        tutorCards.innerHTML = '<div class="empty-state"><h3>No tutors found</h3><p>Be the first to create a tutor profile!</p></div>';
        return;
    }
    
    tutorCards.innerHTML = tutors.map(tutor => `
        <div class="tutor-card">
            <h3>${tutor.name}</h3>
            <div class="tutor-grade">Grade ${tutor.grade}</div>
            <div class="tutor-subjects">
                ${tutor.subjects.map(subject => `<span class="subject-tag">${subject}</span>`).join('')}
            </div>
            ${tutor.bio ? `<div class="tutor-bio">${tutor.bio}</div>` : ''}
            ${tutor.availability ? `<div class="tutor-availability">📅 ${tutor.availability}</div>` : ''}
            ${tutor.communicationMethod ? `<div class="tutor-communication">💬 Contact via ${tutor.communicationMethod}${tutor.communicationDetails ? ': ' + tutor.communicationDetails : ''}</div>` : ''}
            <button class="book-btn" onclick="openBookingModal('${tutor.id}', '${tutor.name}')">
                Request Tutoring
            </button>
        </div>
    `).join('');
}

// Search functionality (replaced by autocomplete setup)
// Search logic is now handled in setupAutocompleteFields

// Booking modal
function openBookingModal(tutorId, tutorName) {
    document.getElementById('selectedTutorId').value = tutorId;
    bookingModal.style.display = 'block';
    
    // Find the tutor data to get their subjects
    const tutor = allTutors.find(t => t.id === tutorId);
    
    // Clear the subject input
    const subjectInput = document.getElementById('requestSubject');
    subjectInput.value = '';
    
    // Setup autocomplete for this specific tutor's subjects
    if (tutor && tutor.subjects) {
        setupAutocomplete('requestSubject', () => tutor.subjects, false, true);
    }
    
    // Set date restrictions: 2 days from today to 2 weeks from today
    const today = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);
    
    const dateInput = document.getElementById('requestDate');
    dateInput.min = twoDaysFromNow.toISOString().split('T')[0];
    dateInput.max = twoWeeksFromNow.toISOString().split('T')[0];
    dateInput.value = twoDaysFromNow.toISOString().split('T')[0];
}

// Make functions globally available
window.openBookingModal = openBookingModal;

// Function to update request status (accept/decline)
async function updateRequestStatus(requestId, newStatus, declineMessage = '') {
    try {
        const requestRef = doc(db, 'bookingRequests', requestId);
        
        // Get the request data first to send to Google Sheets
        const requestDoc = await getDoc(requestRef);
        const requestData = requestDoc.data();
        
        // Update the request status
        const updateData = { status: newStatus };
        if (declineMessage) {
            updateData.declineMessage = declineMessage;
        }
        
        await updateDoc(requestRef, updateData);
        
        // If accepted, send booking confirmation to Google Sheets
        if (newStatus === 'accepted') {
            const bookingData = {
                ...requestData,
                action: 'booking' // Different action for accepted bookings
            };
            await writeToGoogleSheetsViaAppsScript(bookingData);
        }
        
        showMessage(`Request ${newStatus} successfully!`, 'success');
        loadMyRequests(); // Refresh the list
    } catch (error) {
        console.error('Error updating request status:', error);
        showMessage('Error updating request status. Please try again.', 'error');
    }
}

window.updateRequestStatus = updateRequestStatus;

// Close modal functionality
document.querySelector('.close').addEventListener('click', () => {
    bookingModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
        bookingModal.style.display = 'none';
    }
});

// Booking form submission
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const tutorId = document.getElementById('selectedTutorId').value;
    const subject = document.getElementById('requestSubject').value;
    const date = document.getElementById('requestDate').value;
    const timeHour = document.getElementById('requestTimeHour').value;
    const timeMinute = document.getElementById('requestTimeMinute').value;
    const duration = document.getElementById('requestDuration').value;
    const location = document.getElementById('requestLocation').value;
    const notes = document.getElementById('requestNotes').value;
    
    // Get tutor information
    const tutor = allTutors.find(t => t.id === tutorId);
    if (!tutor) {
        showMessage('Error: Tutor not found.', 'error');
        return;
    }
    
    // Validate subject is one that the tutor teaches
    if (!tutor.subjects.includes(subject)) {
        showMessage('Please select a valid subject that this tutor teaches.', 'error');
        return;
    }
    
    // Combine hour and minute into time format
    const startTime = `${timeHour}:${timeMinute}`;
    
    // Calculate end time based on duration
    const startDate = new Date(`2000-01-01T${startTime}:00`);
    const endDate = new Date(startDate.getTime() + parseInt(duration) * 60000);
    const endTime = endDate.toTimeString().substr(0, 5);
    if (!tutor) {
        showMessage('Error: Tutor not found.', 'error');
        return;
    }
    
    const requestData = {
        tutorId: tutorId,
        tutorName: tutor.name,
        tutorEmail: tutor.email,
        studentId: currentUser.uid,
        studentName: currentUser.displayName,
        studentEmail: currentUser.email,
        subject: subject,
        preferredDate: date,
        preferredStartTime: startTime,
        preferredEndTime: endTime,
        duration: parseInt(duration),
        preferredLocation: location,
        notes: notes,
        status: 'pending',
        createdAt: Timestamp.now()
    };
    
    try {
        // Disable the submit button to prevent double submission
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        await addDoc(collection(db, 'bookingRequests'), requestData);
        
        // Write to Google Sheets using Apps Script
        await writeToGoogleSheetsViaAppsScript(requestData);
        
        showMessage('Booking request sent successfully!', 'success');
        bookingModal.style.display = 'none';
        bookingForm.reset();
        
        // Re-enable the submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    } catch (error) {
        console.error('Error sending booking request:', error);
        showMessage('Error sending request. Please try again.', 'error');
        
        // Re-enable the submit button on error
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Request';
    }
});

// Utility function to format time from 24-hour to 12-hour format
function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
}

// Load user's booking requests (only pending ones)
async function loadMyRequests() {
    if (!currentUser) return;
    
    try {
        myRequests.innerHTML = '<div class="loading"></div>';
        
        // Get all requests (pending and declined) where user is the student
        const studentQuery = query(
            collection(db, 'bookingRequests'),
            where('studentId', '==', currentUser.uid),
            where('status', 'in', ['pending', 'declined'])
        );
        
        // Get all requests (pending and declined) where user is the tutor
        const tutorQuery = query(
            collection(db, 'bookingRequests'),
            where('tutorId', '==', currentUser.uid),
            where('status', 'in', ['pending', 'declined'])
        );
        
        const [studentSnapshot, tutorSnapshot] = await Promise.all([
            getDocs(studentQuery),
            getDocs(tutorQuery)
        ]);
        
        const requests = [];
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const pastRequests = []; // Track requests to delete
        
        studentSnapshot.forEach((doc) => {
            const requestData = { id: doc.id, type: 'sent', ...doc.data() };
            if (requestData.preferredDate < today) {
                pastRequests.push(doc.id);
            } else {
                requests.push(requestData);
            }
        });
        
        tutorSnapshot.forEach((doc) => {
            const requestData = { id: doc.id, type: 'received', ...doc.data() };
            if (requestData.preferredDate < today) {
                pastRequests.push(doc.id);
            } else {
                requests.push(requestData);
            }
        });
        
        // Remove past requests from database (fire and forget)
        if (pastRequests.length > 0) {
            console.log(`Cleaning up ${pastRequests.length} past requests from database`);
            pastRequests.forEach(async (requestId) => {
                try {
                    await deleteDoc(doc(db, 'bookingRequests', requestId));
                    console.log(`Deleted past request: ${requestId}`);
                } catch (error) {
                    console.error(`Error deleting request ${requestId}:`, error);
                }
            });
        }
        
        displayMyRequests(requests);
    } catch (error) {
        console.error('Error loading requests:', error);
        myRequests.innerHTML = '<div class="empty-state"><h3>Error loading requests</h3><p>Please try again later.</p></div>';
    }
}

function displayMyRequests(requests) {
    if (requests.length === 0) {
        myRequests.innerHTML = '<div class="empty-state"><h3>No current requests</h3><p>Your pending and declined requests will appear here.</p></div>';
        return;
    }
    
    // Sort by creation date (newest first)
    requests.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    
    myRequests.innerHTML = requests.map(request => `
        <div class="request-card ${request.status === 'declined' ? 'declined-request' : ''}">
            <div class="request-type ${request.type}">${request.type === 'sent' ? 'SENT REQUEST' : 'RECEIVED REQUEST'}</div>
            <div class="request-status status-${request.status}">${request.status.toUpperCase()}</div>
            <h4>${request.subject}</h4>
            ${request.type === 'sent' ? 
                `<p><strong>Tutor:</strong> ${request.tutorName}</p>` : 
                `<p><strong>Student:</strong> ${request.studentName} (${request.studentEmail})</p>`
            }
            <p><strong>Date:</strong> ${request.preferredDate}</p>
            <p><strong>Time:</strong> ${formatTime(request.preferredStartTime)}${request.preferredEndTime ? ' - ' + formatTime(request.preferredEndTime) : ''}</p>
            ${request.duration ? `<p><strong>Duration:</strong> ${request.duration} minutes</p>` : ''}
            ${request.preferredLocation ? `<p><strong>Location:</strong> ${request.preferredLocation}</p>` : ''}
            ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
            <p><strong>Requested:</strong> ${request.createdAt.toDate().toLocaleDateString()}</p>
            ${request.status === 'declined' && request.declineMessage ? `<p><strong>Decline Reason:</strong> ${request.declineMessage}</p>` : ''}
            ${request.type === 'received' && request.status === 'pending' ? `
                <div class="request-actions">
                    <button class="btn-accept" onclick="acceptRequest('${request.id}')">Accept</button>
                    <button class="btn-decline" onclick="declineRequest('${request.id}')">Decline</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Load user's confirmed slots (accepted bookings)
async function loadMySlots() {
    const slotsCalendar = document.getElementById('slotsCalendar');
    if (!currentUser || !slotsCalendar) return;
    
    try {
        slotsCalendar.innerHTML = '<div class="loading"></div>';
        
        // Get all requests (accepted and declined) where user is the student or tutor
        const studentQuery = query(
            collection(db, 'bookingRequests'),
            where('studentId', '==', currentUser.uid),
            where('status', 'in', ['accepted', 'declined'])
        );
        
        const tutorQuery = query(
            collection(db, 'bookingRequests'),
            where('tutorId', '==', currentUser.uid),
            where('status', 'in', ['accepted', 'declined'])
        );
        
        const [studentSnapshot, tutorSnapshot] = await Promise.all([
            getDocs(studentQuery),
            getDocs(tutorQuery)
        ]);
        
        const slots = [];
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const pastSessions = []; // Track sessions to delete
        
        studentSnapshot.forEach(doc => {
            const sessionData = { id: doc.id, role: 'student', ...doc.data() };
            if (sessionData.preferredDate < today) {
                pastSessions.push(doc.id);
            } else {
                slots.push(sessionData);
            }
        });
        
        tutorSnapshot.forEach(doc => {
            const sessionData = { id: doc.id, role: 'tutor', ...doc.data() };
            if (sessionData.preferredDate < today) {
                pastSessions.push(doc.id);
            } else {
                slots.push(sessionData);
            }
        });
        
        // Remove past sessions from database (fire and forget)
        if (pastSessions.length > 0) {
            console.log(`Cleaning up ${pastSessions.length} past sessions from database`);
            pastSessions.forEach(async (sessionId) => {
                try {
                    await deleteDoc(doc(db, 'bookingRequests', sessionId));
                    console.log(`Deleted past session: ${sessionId}`);
                } catch (error) {
                    console.error(`Error deleting session ${sessionId}:`, error);
                }
            });
        }
        
        displayMySlots(slots);
    } catch (error) {
        console.error('Error loading slots:', error);
        slotsCalendar.innerHTML = '<div class="empty-state"><h3>Error loading slots</h3><p>Please try again later.</p></div>';
    }
}

function displayMySlots(slots) {
    const slotsCalendar = document.getElementById('slotsCalendar');
    if (!slotsCalendar) return;
    
    if (slots.length === 0) {
        slotsCalendar.innerHTML = '<div class="empty-state"><h3>No upcoming sessions</h3><p>Your confirmed and declined sessions will appear here.</p></div>';
        return;
    }
    
    // Sort by date
    slots.sort((a, b) => new Date(a.preferredDate) - new Date(b.preferredDate));
    
    // Create calendar view
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get calendar HTML
    slotsCalendar.innerHTML = generateCalendarHTML(slots, currentYear, currentMonth);
    
    // Add navigation event listeners
    setupCalendarNavigation(slots);
}

function generateCalendarHTML(slots, year, month) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const slotsByDate = {};
    slots.forEach(slot => {
        const date = new Date(slot.preferredDate).toDateString();
        if (!slotsByDate[date]) slotsByDate[date] = [];
        slotsByDate[date].push(slot);
    });
    
    let html = `
        <div class="calendar-header">
            <button class="nav-btn" onclick="navigateCalendar(-1)">&lt;</button>
            <h3>${monthNames[month]} ${year}</h3>
            <button class="nav-btn" onclick="navigateCalendar(1)">&gt;</button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
    `;
    
    for (let d = new Date(startDate); d <= lastDay || d.getDay() !== 0; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const daySlots = slotsByDate[dateStr] || [];
        const isCurrentMonth = d.getMonth() === month;
        const isToday = d.toDateString() === new Date().toDateString();
        
        html += `
            <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                <div class="day-number">${d.getDate()}</div>
                <div class="day-sessions">
                    ${daySlots.map(slot => `
                        <div class="session-block ${slot.role} ${slot.status === 'declined' ? 'declined' : ''}" 
                             onclick="showSessionDetails('${slot.id}')"
                             title="${slot.subject} with ${slot.role === 'student' ? slot.tutorName : slot.studentName} (${slot.status})">
                            <span class="session-time">${formatTime(slot.preferredStartTime)}</span>
                            <span class="session-subject">${slot.subject}</span>
                            ${slot.status === 'declined' ? '<span class="session-status">❌</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Add session details modal
    html += `
        <div id="sessionModal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="close" onclick="closeSessionModal()">&times;</span>
                <div id="sessionDetails"></div>
            </div>
        </div>
    `;
    
    return html;
}

let currentCalendarSlots = [];
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

function setupCalendarNavigation(slots) {
    currentCalendarSlots = slots;
    currentCalendarYear = new Date().getFullYear();
    currentCalendarMonth = new Date().getMonth();
}

function navigateCalendar(direction) {
    currentCalendarMonth += direction;
    if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    } else if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    }
    
    const slotsCalendar = document.getElementById('slotsCalendar');
    slotsCalendar.innerHTML = generateCalendarHTML(currentCalendarSlots, currentCalendarYear, currentCalendarMonth);
}

function showSessionDetails(sessionId) {
    const session = currentCalendarSlots.find(slot => slot.id === sessionId);
    if (!session) return;
    
    const modal = document.getElementById('sessionModal');
    const details = document.getElementById('sessionDetails');
    
        details.innerHTML = `
            <div class="session-detail-card ${session.role} ${session.status === 'declined' ? 'declined' : ''}">
                <div class="session-role">${session.role === 'student' ? "I'm Learning" : "I'm Teaching"}</div>
                <div class="session-status-badge ${session.status}">${session.status === 'accepted' ? '✅ Accepted' : '❌ Declined'}</div>
                <h4>${session.subject}</h4>
                ${session.role === 'student' ? 
                    `<p><strong>Tutor:</strong> ${session.tutorName}</p>` : 
                    `<p><strong>Student:</strong> ${session.studentName}</p>`
                }
                <p><strong>Date:</strong> ${new Date(session.preferredDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${formatTime(session.preferredStartTime)} - ${formatTime(session.preferredEndTime)}</p>
                ${session.duration ? `<p><strong>Duration:</strong> ${session.duration} minutes</p>` : ''}
                ${session.preferredLocation ? `<p><strong>Location:</strong> ${session.preferredLocation}</p>` : ''}
                ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
                ${session.communicationMethod ? `<p><strong>Contact:</strong> ${session.communicationMethod}</p>` : ''}
                ${session.status === 'declined' && session.declineMessage ? `<p><strong>Decline Reason:</strong> ${session.declineMessage}</p>` : ''}
            </div>
        `;    modal.style.display = 'block';
}

function closeSessionModal() {
    document.getElementById('sessionModal').style.display = 'none';
}

// Make functions globally available
window.navigateCalendar = navigateCalendar;
window.showSessionDetails = showSessionDetails;
window.closeSessionModal = closeSessionModal;

// Functions for accept and decline with optional message
function acceptRequest(requestId) {
    updateRequestStatus(requestId, 'accepted');
}

function declineRequest(requestId) {
    const message = prompt('Optional: Add a message for the student (or leave blank):');
    updateRequestStatus(requestId, 'declined', message || '');
}

// Make new functions globally available
window.acceptRequest = acceptRequest;
window.declineRequest = declineRequest;
async function loadProfile() {
    if (!currentUser) return;
    
    try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
            profileInfo.innerHTML = `
                <div class="profile-header">
                    ${profile.profilePicture ? 
                        `<div class="profile-picture-display">
                            <img src="${profile.profilePicture}" alt="Profile Picture">
                        </div>` : ''
                    }
                    <div class="profile-name-section">
                        <h2 class="profile-name">${profile.name}</h2>
                        <p class="profile-grade">Grade ${profile.grade} Student</p>
                    </div>
                </div>
                <div class="profile-details">
                    <p><strong>Email:</strong> ${profile.email}</p>
                    <p><strong>Subjects:</strong> ${profile.subjects.join(', ')}</p>
                    ${profile.bio ? `<p><strong>Bio:</strong> ${profile.bio}</p>` : ''}
                    ${profile.availability ? `<p><strong>Availability:</strong> ${profile.availability}</p>` : ''}
                    ${profile.communicationMethod ? `<p><strong>Communication Method:</strong> ${profile.communicationMethod}${profile.communicationDetails ? ': ' + profile.communicationDetails : ''}</p>` : ''}
                    <p><strong>Tutor Status:</strong> ${profile.isTutor !== false ? 'Active Tutor' : 'Not Tutoring'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        profileInfo.innerHTML = '<p>Error loading profile</p>';
    }
}

// Edit profile functionality
editProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    
    try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
            // Pre-populate form with existing data
            document.getElementById('tutorName').value = profile.name || '';
            document.getElementById('tutorGrade').value = profile.grade || '';
            document.getElementById('tutorBio').value = profile.bio || '';
            document.getElementById('tutorAvailability').value = profile.availability || '';
            document.getElementById('communicationMethod').value = profile.communicationMethod || '';
            document.getElementById('communicationDetails').value = profile.communicationDetails || '';
            document.getElementById('isTutorCheckbox').checked = profile.isTutor !== false;
            
            // Show/hide communication details based on method
            toggleCommunicationDetails();
            
            // Populate existing subjects
            setTimeout(() => {
                populateExistingSubjects(profile.subjects || []);
            }, 100);
        }
        showSetupScreen();
    } catch (error) {
        console.error('Error loading profile for editing:', error);
        showSetupScreen();
    }
});

// Google Sheets integration using Firebase Auth token
async function writeToGoogleSheets(requestData) {
    try {
        console.log('Attempting to write to Google Sheets with data:', requestData);
        
        if (!currentUser) {
            console.log('No authenticated user for Google Sheets');
            return;
        }
        
        // Get the Firebase Auth token
        const token = await currentUser.getIdToken();
        console.log('Got Firebase token for Sheets API');
        
        const timestamp = new Date().toISOString();
        const action = 'request'; // This is a request initially
        
        // Prepare the row data according to your sheet structure:
        // timestamp, tutorname, tutoremail, studentname, studentemail, subject, date, starttime, endtime, location, action
        const values = [[
            timestamp,
            requestData.tutorName || '',
            requestData.tutorEmail || '',
            requestData.studentName || '',
            requestData.studentEmail || '',
            requestData.subject || '',
            requestData.preferredDate || '',
            requestData.preferredStartTime || '',
            requestData.preferredEndTime || '',
            requestData.preferredLocation || '',
            action
        ]];
        
        console.log('Data to be written:', values);
        
        // Use a simpler approach: just create a CSV string and offer download
        const csvData = values[0].join(',');
        console.log('CSV data:', csvData);
        
        // For now, let's use a webhook or alternative approach
        // Since Google Sheets API requires specific OAuth setup
        
        // Alternative 1: Use Google Apps Script Web App (recommended)
        // You would need to create a Google Apps Script that accepts POST requests
        
        // Alternative 2: Use a webhook service like Zapier or Make.com
        
        // Alternative 3: Download as CSV (fallback)
        downloadAsCSV(requestData);
        
        showMessage('Booking data prepared for export. CSV downloaded as backup.', 'success');
        return { success: true };
        
    } catch (error) {
        console.error('Error writing to Google Sheets:', error);
        showMessage('Warning: Could not export to Google Sheets, but booking was saved.', 'error');
        // Don't throw the error to prevent blocking the main booking flow
    }
}

// Function to download booking data as CSV
function downloadAsCSV(requestData) {
    const timestamp = new Date().toISOString();
    const csvData = [
        ['timestamp', 'tutorname', 'tutoremail', 'studentname', 'studentemail', 'subject', 'date', 'starttime', 'endtime', 'location', 'action'],
        [
            timestamp,
            requestData.tutorName || '',
            requestData.tutorEmail || '',
            requestData.studentName || '',
            requestData.studentEmail || '',
            requestData.subject || '',
            requestData.preferredDate || '',
            requestData.preferredStartTime || '',
            requestData.preferredEndTime || '',
            requestData.preferredLocation || '',
            'request'
        ]
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking_${timestamp.split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Test function for Google Sheets integration - call this from browser console
window.testGoogleSheets = async function() {
    console.log('Testing Google Sheets integration...');
    
    const testData = {
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@email.com',
        studentName: 'Test Student',
        studentEmail: 'teststudent@email.com',
        subject: 'Test Subject',
        preferredDate: '2024-01-15',
        preferredStartTime: '14:00',
        preferredEndTime: '15:00',
        preferredLocation: 'library'
    };
    
    try {
        const result = await writeToGoogleSheets(testData);
        console.log('Test successful:', result);
        return result;
    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
};

// Alternative Google Sheets integration using Apps Script webhook with JSONP fallback
async function writeToGoogleSheetsViaAppsScript(requestData) {
    // Google Apps Script Web App URL
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwB-7LcwEqEfqGU6MovqLNA-xiJnm2O62I98CqF7e_Z5WC48bQu7mamLV2qCxYP7RhO/exec';
    
    try {
        const timestamp = new Date().toISOString();
        const payload = {
            timestamp: timestamp,
            tutorName: requestData.tutorName || '',
            tutorEmail: requestData.tutorEmail || '',
            studentName: requestData.studentName || '',
            studentEmail: requestData.studentEmail || '',
            subject: requestData.subject || '',
            date: requestData.preferredDate || '',
            startTime: requestData.preferredStartTime || '',
            endTime: requestData.preferredEndTime || '',
            location: requestData.preferredLocation || '',
            action: 'request'
        };
        
        console.log('Attempting to write to Google Sheets via Apps Script...');
        
        // Try JSONP approach to avoid CORS
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            
            // Create JSONP callback
            window[callbackName] = function(data) {
                console.log('JSONP response:', data);
                if (data.success) {
                    showMessage('Data successfully exported to Google Sheets!', 'success');
                    resolve(data);
                } else {
                    showMessage('Warning: Could not export to Google Sheets, but booking was saved.', 'error');
                    reject(new Error(data.error || 'Unknown error'));
                }
                // Cleanup
                document.head.removeChild(script);
                delete window[callbackName];
            };
            
            // Create script tag for JSONP
            const script = document.createElement('script');
            const params = new URLSearchParams({
                callback: callbackName,
                ...payload
            });
            script.src = APPS_SCRIPT_URL + '?' + params.toString();
            
            script.onerror = function() {
                console.error('JSONP request failed');
                showMessage('Warning: Could not export to Google Sheets, but booking was saved.', 'error');
                document.head.removeChild(script);
                delete window[callbackName];
                reject(new Error('JSONP request failed'));
            };
            
            document.head.appendChild(script);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (window[callbackName]) {
                    console.error('JSONP request timed out');
                    showMessage('Warning: Google Sheets export timed out, but booking was saved.', 'error');
                    document.head.removeChild(script);
                    delete window[callbackName];
                    reject(new Error('Request timed out'));
                }
            }, 10000);
        });
        
    } catch (error) {
        console.error('Error writing to Google Sheets via Apps Script:', error);
        showMessage('Warning: Could not export to Google Sheets, but booking was saved.', 'error');
        throw error;
    }
}

// Test function to check if the spreadsheet is accessible
window.testSheetAccess = async function() {
    console.log('Current solution uses CSV download as fallback');
    console.log('For real Google Sheets integration, you need to set up Google Apps Script');
    return true;
};

// Utility function to show messages
function showMessage(text, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    // Insert at the top of main content
    const main = document.querySelector('main');
    main.insertBefore(message, main.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        message.remove();
    }, 5000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('CCA Peer Tutoring App initialized');
    setupSubjectSelection();
    setupAutocompleteFields();
    setupCommunicationMethodListener();
    
    // Setup cancel button functionality
    const cancelSetupBtn = document.getElementById('cancelSetupBtn');
    if (cancelSetupBtn) {
        cancelSetupBtn.addEventListener('click', async () => {
            // Check if user has an existing profile
            if (currentUser) {
                const profile = await getUserProfile(currentUser.uid);
                if (profile) {
                    showAppScreen(); // Go back to app if profile exists
                } else {
                    showLoginScreen(); // Go to login if no profile
                }
            } else {
                showLoginScreen();
            }
        });
    }
});

// Function to toggle communication details visibility
function toggleCommunicationDetails() {
    const methodSelect = document.getElementById('communicationMethod');
    const detailsGroup = document.getElementById('communicationDetailsGroup');
    const detailsInput = document.getElementById('communicationDetails');
    
    if (methodSelect && detailsGroup && detailsInput) {
        const selectedMethod = methodSelect.value;
        
        if (selectedMethod && selectedMethod !== 'email' && selectedMethod !== 'in-person') {
            detailsGroup.style.display = 'block';
            detailsInput.required = true;
            
            // Update placeholder based on method
            switch (selectedMethod) {
                case 'discord':
                    detailsInput.placeholder = 'Discord username (e.g. @username#1234)';
                    break;
                case 'instagram':
                    detailsInput.placeholder = 'Instagram username (e.g. @username)';
                    break;
                case 'phone':
                    detailsInput.placeholder = 'Phone number (e.g. (555) 123-4567)';
                    break;
                default:
                    detailsInput.placeholder = 'Contact details';
            }
        } else {
            detailsGroup.style.display = 'none';
            detailsInput.required = false;
            detailsInput.value = '';
        }
    }
}

// Setup communication method change listener
function setupCommunicationMethodListener() {
    const methodSelect = document.getElementById('communicationMethod');
    if (methodSelect) {
        methodSelect.addEventListener('change', toggleCommunicationDetails);
    }
}

// Function to create subject selection checkboxes
function setupSubjectSelection() {
    const container = document.getElementById('subjectSelection');
    if (!container) return;
    
    Object.keys(subjectData).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'subject-category';
        
        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryHeader.className = 'category-header';
        categoryDiv.appendChild(categoryHeader);
        
        const subjectsDiv = document.createElement('div');
        subjectsDiv.className = 'subjects-list';
        
        subjectData[category].forEach(subject => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `subject-${subject.replace(/[^a-zA-Z0-9]/g, '-')}`;
            checkbox.value = subject;
            checkbox.className = 'subject-checkbox';
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = subject;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            subjectsDiv.appendChild(checkboxDiv);
        });
        
        categoryDiv.appendChild(subjectsDiv);
        container.appendChild(categoryDiv);
    });
}

// Function to populate existing subjects when editing
function populateExistingSubjects(subjects) {
    if (!subjects || subjects.length === 0) return;
    
    subjects.forEach(subject => {
        const checkbox = document.querySelector(`input[value="${subject}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

// Function to get all available subjects as a flat array
function getAllSubjects() {
    const allSubjects = [];
    Object.values(subjectData).forEach(categorySubjects => {
        allSubjects.push(...categorySubjects);
    });
    return allSubjects.sort();
}

// Function to get all tutor names
function getAllTutorNames() {
    return allTutors.map(tutor => tutor.name).sort();
}

// Function to setup autocomplete functionality
function setupAutocompleteFields() {
    // Setup autocomplete for search field
    setupAutocomplete('subjectSearch', () => {
        const subjects = getAllSubjects();
        const names = getAllTutorNames();
        return [...subjects, ...names];
    }, true); // Enable search functionality
}

// Generic autocomplete function
function setupAutocomplete(inputId, getOptionsFunction, enableSearch = false, strictValidation = false) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let dropdown = null;
    let currentFocus = -1;
    
    // Create dropdown container
    function createDropdown() {
        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.display = 'none';
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(dropdown);
    }
    
    // Validate input against allowed options
    function validateInput() {
        if (!strictValidation) return true;
        const options = getOptionsFunction();
        return options.includes(input.value);
    }
    
    // Show dropdown with filtered options
    function showDropdown(options) {
        if (!dropdown) createDropdown();
        
        dropdown.innerHTML = '';
        currentFocus = -1;
        
        if (options.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        options.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = option;
            item.addEventListener('click', () => {
                input.value = option;
                dropdown.style.display = 'none';
                if (enableSearch) {
                    // Trigger search for tutors
                    const searchTerm = option.toLowerCase();
                    const filteredTutors = allTutors.filter(tutor =>
                        tutor.subjects.some(subject => subject.toLowerCase().includes(searchTerm)) ||
                        tutor.name.toLowerCase().includes(searchTerm)
                    );
                    displayTutors(filteredTutors);
                }
            });
            dropdown.appendChild(item);
        });
        
        dropdown.style.display = 'block';
    }
    
    // Hide dropdown
    function hideDropdown() {
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        currentFocus = -1;
    }
    
    // Filter options based on input
    function filterOptions(searchTerm) {
        const options = getOptionsFunction();
        return options.filter(option => 
            option.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 8); // Limit to 8 results
    }
    
    // Handle keyboard navigation
    function handleKeyDown(e) {
        if (!dropdown || dropdown.style.display === 'none') return;
        
        const items = dropdown.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocus = Math.min(currentFocus + 1, items.length - 1);
            updateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocus = Math.max(currentFocus - 1, -1);
            updateFocus(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentFocus > -1 && items[currentFocus]) {
                items[currentFocus].click();
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    }
    
    // Update visual focus
    function updateFocus(items) {
        items.forEach((item, index) => {
            item.classList.toggle('autocomplete-active', index === currentFocus);
        });
    }
    
    // Event listeners
    input.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length > 0) {
            const filtered = filterOptions(searchTerm);
            showDropdown(filtered);
            
            // If this is the search field, also filter tutors
            if (enableSearch) {
                const lowerSearchTerm = searchTerm.toLowerCase();
                const filteredTutors = allTutors.filter(tutor =>
                    tutor.subjects.some(subject => subject.toLowerCase().includes(lowerSearchTerm)) ||
                    tutor.name.toLowerCase().includes(lowerSearchTerm)
                );
                displayTutors(filteredTutors);
            }
        } else {
            hideDropdown();
            if (enableSearch) {
                // Show all tutors when search is empty
                displayTutors(allTutors);
            }
        }
    });
    
    input.addEventListener('keydown', handleKeyDown);
    
    input.addEventListener('blur', () => {
        // Delay hiding to allow clicks on dropdown items
        setTimeout(() => {
            hideDropdown();
            // If strict validation is enabled, clear invalid input
            if (strictValidation && !validateInput()) {
                input.value = '';
                input.style.borderColor = '#dc3545';
                setTimeout(() => {
                    input.style.borderColor = '';
                }, 2000);
            }
        }, 200);
    });
    
    input.addEventListener('focus', () => {
        const searchTerm = input.value.trim();
        if (searchTerm.length > 0) {
            const filtered = filterOptions(searchTerm);
            showDropdown(filtered);
        }
    });
}

// Update search functionality to work with autocomplete
subjectSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredTutors = allTutors.filter(tutor =>
        tutor.subjects.some(subject => subject.toLowerCase().includes(searchTerm)) ||
        tutor.name.toLowerCase().includes(searchTerm)
    );
    displayTutors(filteredTutors);
});

// Event_Emails System
const EVENT_ADMIN_EMAILS = ['adityavshah10@gmail.com']; // Event organizers only
const STATS_ADMIN_EMAILS = ['adityavshah10@gmail.com']; // Stats access only, no website access

async function checkEventAdminStatus() {
    if (!currentUser) return false;
    return EVENT_ADMIN_EMAILS.includes(currentUser.email);
}

async function checkStatsAdminStatus() {
    if (!currentUser) return false;
    return STATS_ADMIN_EMAILS.includes(currentUser.email);
}

async function loadEvents() {
    const eventsList = document.getElementById('eventsList');
    const createEventBtn = document.getElementById('createEventBtn');
    
    if (!eventsList) return;
    
    try {
        // Show admin controls if user is event admin
        const isEventAdmin = await checkEventAdminStatus();
        if (isEventAdmin && createEventBtn) {
            createEventBtn.style.display = 'block';
        }
        
        eventsList.innerHTML = '<div class="loading"></div>';
        
        const querySnapshot = await getDocs(query(
            collection(db, 'events'),
            orderBy('eventDate', 'desc')
        ));
        
        const events = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        eventsList.innerHTML = '<div class="empty-state"><h3>Error loading events</h3><p>Please try again later.</p></div>';
    }
}

function displayEvents(events) {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    if (events.length === 0) {
        eventsList.innerHTML = '<div class="empty-state"><h3>No events yet</h3><p>Check back later for upcoming tutoring events!</p></div>';
        return;
    }
    
    eventsList.innerHTML = events.map(event => {
        const eventDate = new Date(event.eventDate);
        const isPastEvent = eventDate < new Date();
        const participants = event.participants || [];
        const isRegistered = currentUser && participants.includes(currentUser.uid);
        const isFull = participants.length >= event.capacity;
        
        return `
            <div class="event-card ${isPastEvent ? 'past-event' : ''}">
                <div class="event-header">
                    <h3>${event.title}</h3>
                    <span class="event-date">${eventDate.toLocaleDateString()}</span>
                </div>
                <div class="event-details">
                    <p class="event-description">${event.description}</p>
                    <div class="event-info">
                        <p><strong>📅 Date:</strong> ${eventDate.toLocaleDateString()}</p>
                        <p><strong>🕒 Time:</strong> ${formatTime(event.startTime)}</p>
                        <p><strong>📍 Location:</strong> ${event.location}</p>
                        <p><strong>👥 Capacity:</strong> ${participants.length}/${event.capacity}</p>
                    </div>
                </div>
                <div class="event-actions">
                    ${!isPastEvent ? `
                        ${isRegistered ? 
                            `<button class="btn-secondary" onclick="unregisterFromEvent('${event.id}')">Unregister</button>` :
                            `<button class="btn-primary ${isFull ? 'disabled' : ''}" onclick="registerForEvent('${event.id}')" ${isFull ? 'disabled' : ''}>${isFull ? 'Event Full' : 'Register'}</button>`
                        }
                    ` : '<span class="past-event-label">Past Event</span>'}
                    <button class="btn-danger admin-btn admin-only" onclick="deleteEvent('${event.id}')" style="display: none;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Show admin buttons if user is event admin
    checkEventAdminStatus().then(isEventAdmin => {
        if (isEventAdmin) {
            document.querySelectorAll('.admin-only').forEach(btn => {
                btn.style.display = 'inline-block';
            });
        }
    });
}

// Event Registration Functions
async function registerForEvent(eventId) {
    if (!currentUser) return;
    
    try {
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (!eventDoc.exists()) {
            showMessage('Event not found', 'error');
            return;
        }
        
        const eventData = eventDoc.data();
        const participants = eventData.participants || [];
        
        if (participants.includes(currentUser.uid)) {
            showMessage('You are already registered for this event', 'error');
            return;
        }
        
        if (participants.length >= eventData.capacity) {
            showMessage('This event is full', 'error');
            return;
        }
        
        await updateDoc(eventRef, {
            participants: [...participants, currentUser.uid]
        });
        
        showMessage('Successfully registered for event!', 'success');
        loadEvents(); // Refresh events
    } catch (error) {
        console.error('Error registering for event:', error);
        showMessage('Error registering for event', 'error');
    }
}

async function unregisterFromEvent(eventId) {
    if (!currentUser) return;
    
    try {
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (!eventDoc.exists()) {
            showMessage('Event not found', 'error');
            return;
        }
        
        const eventData = eventDoc.data();
        const participants = eventData.participants || [];
        const updatedParticipants = participants.filter(uid => uid !== currentUser.uid);
        
        await updateDoc(eventRef, {
            participants: updatedParticipants
        });
        
        showMessage('Successfully unregistered from event', 'success');
        loadEvents(); // Refresh events
    } catch (error) {
        console.error('Error unregistering from event:', error);
        showMessage('Error unregistering from event', 'error');
    }
}

async function deleteEvent(eventId) {
    if (!await checkAdminStatus()) {
        showMessage('Admin access required', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        await deleteDoc(doc(db, 'events', eventId));
        showMessage('Event deleted successfully', 'success');
        loadEvents(); // Refresh events
    } catch (error) {
        console.error('Error deleting event:', error);
        showMessage('Error deleting event', 'error');
    }
}

// Event Creation
document.getElementById('createEventBtn').addEventListener('click', () => {
    document.getElementById('eventModal').style.display = 'block';
});

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    document.getElementById('eventForm').reset();
}

document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!await checkAdminStatus()) {
        showMessage('Admin access required', 'error');
        return;
    }
    
    const eventData = {
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        eventDate: document.getElementById('eventDate').value,
        startTime: document.getElementById('eventTimeHour').value + ':' + document.getElementById('eventTimeMinute').value,
        location: document.getElementById('eventLocation').value,
        capacity: parseInt(document.getElementById('eventCapacity').value),
        participants: [],
        createdBy: currentUser.uid,
        createdAt: Timestamp.now()
    };
    
    try {
        await addDoc(collection(db, 'events'), eventData);
        showMessage('Event created successfully!', 'success');
        closeEventModal();
        loadEvents(); // Refresh events
    } catch (error) {
        console.error('Error creating event:', error);
        showMessage('Error creating event', 'error');
    }
});

// Statistics System (STATS_ADMIN_EMAILS only)
async function loadStats() {
    const isStatsAdmin = await checkStatsAdminStatus();
    if (!isStatsAdmin) {
        document.getElementById('statsTab').innerHTML = '<div class="empty-state"><h3>Access Denied</h3><p>You do not have permission to view statistics.</p></div>';
        return;
    }

    try {
        // Load basic statistics
        await Promise.all([
            loadBasicStats(),
            loadSubjectStats()
        ]);
    } catch (error) {
        console.error('Error loading stats:', error);
        showMessage('Error loading statistics', 'error');
    }
}

async function loadBasicStats() {
    // Get total sessions (accepted requests)
    const acceptedRequestsQuery = query(
        collection(db, 'bookingRequests'),
        where('status', '==', 'accepted')
    );
    const acceptedSnapshot = await getDocs(acceptedRequestsQuery);
    document.getElementById('totalSessions').textContent = acceptedSnapshot.size;

    // Get active tutors (users who are tutors)
    const tutorsQuery = query(
        collection(db, 'tutors'),
        where('isTutor', '==', true)
    );
    const tutorsSnapshot = await getDocs(tutorsQuery);
    document.getElementById('activeTutors').textContent = tutorsSnapshot.size;

    // Get pending requests
    const pendingRequestsQuery = query(
        collection(db, 'bookingRequests'),
        where('status', '==', 'pending')
    );
    const pendingSnapshot = await getDocs(pendingRequestsQuery);
    document.getElementById('pendingRequests').textContent = pendingSnapshot.size;

    // Get this week's sessions
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weekSessionsQuery = query(
        collection(db, 'bookingRequests'),
        where('status', '==', 'accepted'),
        where('createdAt', '>=', Timestamp.fromDate(oneWeekAgo))
    );
    const weekSnapshot = await getDocs(weekSessionsQuery);
    document.getElementById('weekSessions').textContent = weekSnapshot.size;
}

async function loadSubjectStats() {
    // Get all subjects from the subject data
    const allSubjects = getAllSubjects();
    
    // Initialize all subjects with 0
    const subjectCounts = {};
    allSubjects.forEach(subject => {
        subjectCounts[subject] = 0;
    });
    
    // Get all accepted requests and count by subject
    const acceptedRequestsQuery = query(
        collection(db, 'bookingRequests'),
        where('status', '==', 'accepted')
    );
    const snapshot = await getDocs(acceptedRequestsQuery);
    
    snapshot.forEach((doc) => {
        const data = doc.data();
        const subject = data.subject;
        if (subject && subjectCounts.hasOwnProperty(subject)) {
            subjectCounts[subject]++;
        }
    });

    // Sort subjects alphabetically
    const sortedSubjects = Object.entries(subjectCounts)
        .sort(([a], [b]) => a.localeCompare(b));

    const subjectStatsContainer = document.getElementById('subjectStats');
    subjectStatsContainer.innerHTML = sortedSubjects.map(([subject, count]) => `
        <div class="subject-stat-item">
            <span class="subject-name">${subject}</span>
            <span class="subject-count">${count}</span>
        </div>
    `).join('');
}

// Update showAppScreen to show stats tab for stats admins
async function updateTabVisibility() {
    const isStatsAdmin = await checkStatsAdminStatus();
    const statsTab = document.querySelector('[data-tab="stats"]');
    if (statsTab) {
        statsTab.style.display = isStatsAdmin ? 'block' : 'none';
    }
}

// Make functions globally available
window.registerForEvent = registerForEvent;
window.unregisterFromEvent = unregisterFromEvent;
window.deleteEvent = deleteEvent;
window.closeEventModal = closeEventModal;
