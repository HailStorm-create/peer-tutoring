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
  getDoc,    // Add this
  setDoc,     // Add this
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const provider = new GoogleAuthProvider();

// UI elements
const roleSelect = document.getElementById('role-select');
const currentRole = document.getElementById('current-role');
const bodyEl = document.body;
const signBtn = document.getElementById('sign-btn');
const settingsBtn = document.getElementById('settings-btn');
const profilePic = document.getElementById('profile-pic');
const studentSection = document.querySelector('.student-section');
const tutorSection = document.querySelector('.tutor-section');
const slotForm = document.getElementById('slot-form');
const slotsList = document.getElementById('slots-list');

const locationSelect = document.getElementById('location-select');
const buildingSelectContainer = document.getElementById('building-select-container');
const buildingSelect = document.getElementById('building-select');
const roomSelect = document.getElementById('room-select');

const buildings = ['B', 'C', 'D', 'E', 'F', 'G'];
const floors = ['1', '2'];
const roomNumbers = ['01', '02', '03', '04', '05', '06', '07', '08'];

// Subject data
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

// Add these after your existing UI elements declarations
const subjectCategory = document.getElementById('subject-category');
const specificSubjectContainer = document.getElementById('specific-subject-container');
const specificSubject = document.getElementById('specific-subject');
const languageLevelContainer = document.getElementById('language-level-container');
const languageLevel = document.getElementById('language-level');

const availableSlots = document.getElementById('available-slots');
const studentSubjectFilter = document.getElementById('student-subject-filter');

// Make selectedCalendarDate global so all functions can access it
let selectedCalendarDate = '';

const profileSetupModal = document.getElementById('profile-setup-modal');
const profileSetupForm = document.getElementById('profile-setup-form');
const settingsModal = document.getElementById('settings-modal');

// Function to convert image to base64 and resize
function convertImageToBase64(file, maxWidth = 200, maxHeight = 200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', quality);
      resolve(base64);
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Function to create subject checkboxes
function createSubjectCheckboxes(containerId, selectedSubjects = [], namePrefix = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  Object.keys(subjectData).forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'subject-category-section';
    
    const categoryTitle = document.createElement('div');
    categoryTitle.className = 'subject-category-title';
    categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categoryDiv.appendChild(categoryTitle);
    
    subjectData[category].forEach(subject => {
      const label = document.createElement('label');
      label.className = 'subject-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = namePrefix + 'subjects';
      checkbox.value = subject;
      checkbox.checked = selectedSubjects.includes(subject);
      // Checkbox before label text
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + subject));
      categoryDiv.appendChild(label);
    });
    
    container.appendChild(categoryDiv);
  });
  // Add change note if not already present
  if (!container.querySelector('.change-note')) {
    const note = document.createElement('div');
    note.className = 'change-note';
    note.style.color = '#666';
    note.style.fontSize = '0.95em';
    note.style.marginTop = '0.5em';
    note.textContent = 'You can always change this later in your settings.';
    container.appendChild(note);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Uncheck all help-needed checkboxes if never-student is checked
  document.getElementById('never-student').addEventListener('change', function() {
    if (this.checked) {
      document.querySelectorAll('#help-needed-subjects input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    }
  });
  // Uncheck all tutoring checkboxes if never-tutor is checked
  document.getElementById('never-tutor').addEventListener('change', function() {
    if (this.checked) {
      document.querySelectorAll('#tutoring-subjects input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    }
  });
  // Populate subject checkboxes in profile setup
  createSubjectCheckboxes('help-needed-subjects', [], 'help-');
  createSubjectCheckboxes('tutoring-subjects', [], 'tutor-');
  
  // --- Date dropdown for student filter ---
  // Populate start time dropdown (hour and half-hour only)
  function populateStartTimeDropdown() {
    const startTimeSelect = document.getElementById('start-time');
    if (!startTimeSelect) return;
    startTimeSelect.innerHTML = '';
    // Allow times from 7:00 to 18:30 (7am to 6:30pm)
    for (let hour = 7; hour <= 18; hour++) {
      [0, 30].forEach(min => {
        const h = hour.toString().padStart(2, '0');
        const m = min.toString().padStart(2, '0');
        const value = `${h}:${m}`;
        const ampm = hour < 12 ? 'AM' : 'PM';
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12;
        const display = `${displayHour}:${m === '00' ? '00' : '30'} ${ampm}`;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = display;
        startTimeSelect.appendChild(opt);
      });
    }
  }
  populateStartTimeDropdown();
  const calendarContainer = document.getElementById('student-calendar-filter');
  // Use global selectedCalendarDate
  function renderDateDropdown() {
    calendarContainer.innerHTML = '';
    const { min, max } = getMinMaxDates();
    let d = new Date(min);
    d.setHours(0,0,0,0);
    const days = [];
    while (d <= max) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    const select = document.createElement('select');
    select.id = 'student-date-filter';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All Dates';
    select.appendChild(allOpt);
    days.forEach(date => {
      const opt = document.createElement('option');
      opt.value = date.toISOString().split('T')[0];
      opt.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
      select.appendChild(opt);
    });
    select.value = selectedCalendarDate;
    select.addEventListener('change', () => {
      selectedCalendarDate = select.value;
      loadAvailableSlots();
    });
    calendarContainer.appendChild(select);
  }
  renderDateDropdown();
  populateStartTimeDropdown();
  // Initialize date input restrictions
  const dateInput = document.getElementById('slot-date');
  const dateWarning = document.getElementById('date-warning');
  const { min, max } = getMinMaxDates();

  // Format dates for input[type="date"]
  const minStr = min.toISOString().split('T')[0];
  const maxStr = max.toISOString().split('T')[0];
  dateInput.min = minStr;
  dateInput.max = maxStr;

  // --- Day select auto-update logic for slot form ---
  const daySelect = document.getElementById('day-select');
  function validateDateInput() {
    const value = dateInput.value;
    let showWarning = false;
    let warningText = '';
    if (!value) {
      showWarning = true;
      warningText = `DATE HAS TO BE WITHIN THESE DATES: ${minStr} to ${maxStr}`;
    } else {
      const date = new Date(value);
      if (isNaN(date.getTime()) || date < min || date > max) {
        showWarning = true;
        warningText = `DATE HAS TO BE WITHIN THESE DATES: ${minStr} to ${maxStr}`;
      }
    }
    dateWarning.style.display = showWarning ? 'block' : 'none';
    dateWarning.textContent = showWarning ? warningText : '';
  }

  dateInput.addEventListener('change', function () {
    const value = this.value;
    if (!value) {
      daySelect.innerHTML = '<option value="">Day will be set automatically</option>';
      daySelect.disabled = true;
    } else {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        daySelect.innerHTML = '<option value="">Day will be set automatically</option>';
        daySelect.disabled = true;
      } else {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[date.getDay()];
        daySelect.innerHTML = `<option value="${dayName}" selected>${dayName}</option>`;
        daySelect.disabled = false;
      }
    }
    validateDateInput();
  });

  // Validate on page load and whenever date input changes
  validateDateInput();
  dateInput.addEventListener('input', validateDateInput);

  // Initial cleanup and load
  cleanupExpiredSlots();

  // Settings modal functionality
  const studentTab = document.getElementById('student-settings-tab');
  const tutorTab = document.getElementById('tutor-settings-tab');
  const studentContent = document.getElementById('student-settings');
  const tutorContent = document.getElementById('tutor-settings');

  studentTab?.addEventListener('click', () => {
    studentTab.classList.add('active');
    tutorTab.classList.remove('active');
    studentContent.style.display = 'block';
    tutorContent.style.display = 'none';
  });

  tutorTab?.addEventListener('click', () => {
    tutorTab.classList.add('active');
    studentTab.classList.remove('active');
    tutorContent.style.display = 'block';
    studentContent.style.display = 'none';
  });

  // Close settings modal
  document.getElementById('close-settings-modal')?.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
});


buildings.forEach(building => {
  const option = document.createElement('option');
  option.value = building;
  option.textContent = `Building ${building}`;
  buildingSelect.appendChild(option);
});

// Subject category selection handler
subjectCategory.addEventListener('change', (e) => {
  const category = e.target.value;
  specificSubject.innerHTML = '<option value="">Select Specific Course</option>';
  
  if (category && subjectData[category]) {
    specificSubjectContainer.style.display = 'block';
    
    subjectData[category].forEach(course => {
      const option = document.createElement('option');
      option.value = course;
      option.textContent = course;
      specificSubject.appendChild(option);
    });
    
    // Show language level dropdown for languages
    if (category === 'languages') {
      languageLevelContainer.style.display = 'block';
      languageLevel.required = true;
    } else {
      languageLevelContainer.style.display = 'none';
      languageLevel.required = false;
    }
  } else {
    specificSubjectContainer.style.display = 'none';
    languageLevelContainer.style.display = 'none';
    languageLevel.required = false;
  }
});

locationSelect.addEventListener('change', (e) => {
  if (e.target.value === 'school') {
    buildingSelectContainer.style.display = 'block';
    buildingSelect.required = true;
    roomSelect.required = true;
  } else {
    buildingSelectContainer.style.display = 'none';
    buildingSelect.required = false;
    roomSelect.required = false;
  }
});

buildingSelect.addEventListener('change', (e) => {
  roomSelect.innerHTML = '<option value="">Select Room</option>';
  const selectedBuilding = e.target.value;
  
  floors.forEach(floor => {
    roomNumbers.forEach(room => {
      const roomNumber = `${selectedBuilding}${floor}${room}`;
      const option = document.createElement('option');
      option.value = roomNumber;
      option.textContent = roomNumber;
      roomSelect.appendChild(option);
    });
  });
});

studentSubjectFilter.addEventListener('change', loadAvailableSlots);

// Settings button functionality
settingsBtn?.addEventListener('click', async () => {
  if (!auth.currentUser) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Populate current settings
      createSubjectCheckboxes('student-help-subjects', userData.helpNeededSubjects || [], 'help-');
      createSubjectCheckboxes('tutor-help-subjects', userData.tutoringSubjects || [], 'tutor-');
      
      document.getElementById('settings-never-student').checked = userData.neverStudent || false;
      document.getElementById('settings-never-tutor').checked = userData.neverTutor || false;
      
      settingsModal.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
});


roleSelect.addEventListener('change', async (e) => {
  const role = e.target.value;
  bodyEl.classList.toggle('tutor-view', role === 'tutor');
  bodyEl.classList.toggle('student-view', role === 'student');
  currentRole.textContent = role[0].toUpperCase() + role.slice(1);
  
  if (role === 'student' && auth.currentUser) {
    studentSection.style.display = 'block';
    tutorSection.style.display = 'none';
    await loadTutorSlots();
  } else {
    studentSection.style.display = 'none';
    tutorSection.style.display = 'block';
    await loadAvailableSlots(); // This will refresh available slots when switching to student view
  }
});


// Slot form submission
// Slot form submission
// Modify the slot form submission handler
// Replace the existing slot form submission handler
slotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!auth.currentUser) {
    alert('Please sign in to create slots');
    return;
  }

  try {
    const date = document.getElementById('slot-date').value;
    const startTime = document.getElementById('start-time').value;
    const duration = parseInt(document.getElementById('duration').value, 10);
    const location = document.getElementById('location-select').value;
    const subjectCat = document.getElementById('subject-category').value;
    const specificSubj = document.getElementById('specific-subject').value;
    const langLevel = document.getElementById('language-level').value;

    // Validate all required fields
    if (!date || !startTime || !duration || !location || !subjectCat || !specificSubj) {
      alert('Please fill in all required fields');
      return;
    }

    // For languages, validate level is selected
    if (subjectCat === 'languages' && !langLevel) {
      alert('Please select a language level');
      return;
    }

    // Validate date range
    const selectedDate = new Date(date);
    const { min, max } = getMinMaxDates();
    if (selectedDate < min || selectedDate > max) {
      alert('Please select a date between 2 days and 2 weeks from now');
      return;
    }

    // Calculate end time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startDateObj = new Date(2000, 0, 1, startHour, startMinute);
    const endDateObj = new Date(startDateObj.getTime() + duration * 60000);
    const endHour = endDateObj.getHours().toString().padStart(2, '0');
    const endMinute = endDateObj.getMinutes().toString().padStart(2, '0');
    const endTime = `${endHour}:${endMinute}`;

    // Get building and room if school location is selected
    let fullLocation = location;
    if (location === 'school') {
      const building = buildingSelect.value;
      const room = roomSelect.value;
      if (!building || !room) {
        alert('Please select both building and room');
        return;
      }
      fullLocation = `School - Room ${room}`;
    }

    // Get tutor's name from Firestore
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!userDoc.exists()) {
      alert('Please complete your profile first');
      return;
    }

    const userData = userDoc.data();

    // Build subject string
    let subjectString = specificSubj;
    if (subjectCat === 'languages' && langLevel) {
      subjectString = `${specificSubj} Level ${langLevel}`;
    }

    const slotData = {
      tutorId: auth.currentUser.uid,
      tutorName: `${userData.firstName} ${userData.lastName}`,
      tutorPhotoBase64: userData.profilePhotoBase64 || 'avatar-placeholder.png',
      date: date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      startTime: startTime,
      endTime: endTime,
      location: fullLocation,
      subject: subjectString,
      subjectCategory: subjectCat,
      createdAt: Timestamp.now()
    };

    // Add to Firestore
    await addDoc(collection(db, 'slots'), slotData);

    // Reset form and reload slots
    slotForm.reset();
    specificSubjectContainer.style.display = 'none';
    languageLevelContainer.style.display = 'none';
    buildingSelectContainer.style.display = 'none';
    await loadTutorSlots();

    alert('Slot created successfully!');
  } catch (error) {
    console.error('Error adding slot:', error);
    alert('Error creating slot. Please try again.');
  }
});

function getMinMaxDates() {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 2); // 2 days from now
  
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 14); // 2 weeks from now
  
  return {
    min: minDate,
    max: maxDate
  };
}

// Update the addSlotToUI function to include subject
function addSlotToUI(id, day, startTime, endTime, location, subject, mathLevels = []) {
  const slotEl = document.createElement('div');
  slotEl.className = 'slot-card';
  slotEl.dataset.id = id;
  
  // Format times to be more readable
  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  const mathLevelsText = mathLevels.length > 0 
    ? `<br><small>Math Levels: ${mathLevels.join(', ')}</small>` 
    : '';

  slotEl.innerHTML = `
    <div style="margin-bottom: 0.5em;">
      <strong>${day}</strong><br>
      <small>${formatTime(startTime)} - ${formatTime(endTime)}</small><br>
      <small>${location} - ${subject}</small>
      ${mathLevelsText}
    </div>
    <button class="delete-slot">Delete</button>
  `;
  
  slotEl.querySelector('.delete-slot').addEventListener('click', async () => {
    try {
      await deleteDoc(doc(db, 'slots', id));
      slotEl.remove();
    } catch (error) {
      console.error('Error deleting slot:', error);
    }
  });
  
  slotsList.appendChild(slotEl);
}
// Load tutor slots
// Replace the existing loadTutorSlots function
async function loadTutorSlots() {
  if (!auth.currentUser) return;
  
  try {
    slotsList.innerHTML = '<div class="loading">Loading slots...</div>';
    
    const q = query(
      collection(db, 'slots'),
      where('tutorId', '==', auth.currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    slotsList.innerHTML = '';
    
    if (querySnapshot.empty) {
      slotsList.innerHTML = '<div class="no-slots">No slots created yet</div>';
      return;
    }
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      addSlotToUI(
        doc.id, 
        data.day, 
        data.startTime, 
        data.endTime, 
        data.location, 
        data.subject, 
        data.mathLevels
      );
    });
  } catch (error) {
    console.error('Error loading slots:', error);
    slotsList.innerHTML = '<div class="error">Error loading slots. Please try again.</div>';
  }
}

async function loadAvailableSlots() {
  try {
    const { min } = getMinMaxDates();
    availableSlots.innerHTML = '';
    let slotsQuery = query(
      collection(db, 'slots'),
      where('date', '>=', min.toISOString().split('T')[0])
    );
    const slotsSnapshot = await getDocs(slotsQuery);
    // Filter by subject and selected date
  const subjectCategory = studentSubjectFilter.value;
  const date = selectedCalendarDate;
    let found = false;
    // Helper to format time
    function formatTime(time) {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    // Collect all tutorIds to fetch their profiles in one go
    const tutorIds = new Set();
    slotsSnapshot.forEach(doc => {
      const slotData = doc.data();
      // Filter by subject category instead of exact subject match
      const matchesSubject = subjectCategory === '' || slotData.subjectCategory === subjectCategory;
      const matchesDate = !date || slotData.date === date;
      if (matchesSubject && matchesDate) {
        tutorIds.add(slotData.tutorId);
      }
    });
    // Fetch all tutor profiles
    const tutorProfiles = {};
    await Promise.all(Array.from(tutorIds).map(async (uid) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        tutorProfiles[uid] = userDoc.exists() ? userDoc.data() : {};
      } catch { tutorProfiles[uid] = {}; }
    }));
    // Render cards
    slotsSnapshot.forEach(doc => {
      const slotData = doc.data();
      const matchesSubject = subjectCategory === '' || slotData.subjectCategory === subjectCategory;
      const matchesDate = !date || slotData.date === date;
      if (matchesSubject && matchesDate) {
        found = true;
        const card = document.createElement('div');
        card.className = 'available-slot-card';
        card.dataset.slotId = doc.id;
        card.innerHTML = `
          <div class="tutor-info">
            <div class="tutor-name">${slotData.tutorName}</div>
            <div class="subject">${slotData.subject}</div>
          </div>
          <div class="slot-details">
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <span>${new Date(slotData.date).toLocaleDateString()} (${slotData.day})</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">🕒</span>
              <span>${formatTime(slotData.startTime)} - ${formatTime(slotData.endTime)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <span>${slotData.location}</span>
            </div>
          </div>
          <button class="book-slot-btn">Book Slot</button>
        `;
        availableSlots.appendChild(card);
      }
    });
    if (!found) {
      availableSlots.innerHTML = '<div class="no-slots">No slots found for the selected filters.</div>';
    }
  } catch (error) {
    console.error('Error loading available slots:', error);
  }
}
async function cleanupExpiredSlots() {
  const { min } = getMinMaxDates();
  
  try {
    const expiredQuery = query(
      collection(db, 'slots'),
      where('date', '<', min.toISOString().split('T')[0])
    );
    
    const expiredSlots = await getDocs(expiredQuery);
    
    expiredSlots.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  } catch (error) {
    console.error('Error cleaning up expired slots:', error);
  }
}
// Run cleanup on load
// Run cleanup when loading slots and periodically
setInterval(cleanupExpiredSlots, 1000 * 60 * 60 * 12); // Run every hour
document.addEventListener('DOMContentLoaded', () => {
  cleanupExpiredSlots();
  setupBookingModal();
});

// --- Booking Modal Logic ---
function setupBookingModal() {
  // Create modal if not present
  let modal = document.getElementById('booking-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'booking-modal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-content" id="booking-modal-content">
        <span id="close-booking-modal" style="float:right;cursor:pointer;font-size:1.5em;">&times;</span>
        <h2>Book Slot</h2>
        <div id="booking-slot-info"></div>
        <form id="booking-form">
          <div class="form-group">
            <label for="booking-start-time">Start Time</label>
            <select id="booking-start-time" required></select>
          </div>
          <div class="form-group">
            <label for="booking-end-time">End Time</label>
            <select id="booking-end-time" required></select>
          </div>
          <p class="booking-note" style="margin-top: 0.5rem; color: #666; font-size: 0.9em;">* Booking duration must be 30 or 60 minutes</p>
          <button type="submit">Confirm Booking</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Event delegation for Book Slot buttons
  availableSlots.addEventListener('click', async (e) => {
    if (e.target.classList.contains('book-slot-btn')) {
      const card = e.target.closest('.available-slot-card');
      const slotId = card.dataset.slotId;
      await openBookingModal(slotId);
    }
  });

  // Close modal
  document.getElementById('close-booking-modal').onclick = () => {
    modal.style.display = 'none';
  };
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}

// Global time formatting function
function formatTimeDisplay(time) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

async function openBookingModal(slotId) {
  const modal = document.getElementById('booking-modal');
  const infoDiv = document.getElementById('booking-slot-info');
  const form = document.getElementById('booking-form');
  
  // Fetch slot data
  const slotDoc = await getDoc(doc(db, 'slots', slotId));
  if (!slotDoc.exists()) {
    alert('Slot not found.');
    return;
  }
  const slot = slotDoc.data();
  
  // Show slot info (no profile pic for now)
  infoDiv.innerHTML = `
    <strong>${slot.tutorName}</strong><br>
    <span>${slot.subject}</span><br>
    <span>${slot.date} (${slot.day})</span><br>
    <span>${slot.location}</span><br>
    <span>${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)}</span>
  `;

  // Helper: generate allowed time options
  function generateTimeOptions(start, end) {
    // Only show times in 30-min increments (e.g., 11:00, 11:30) within the booking range
    const times = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    // Round up startMinutes to next 0 or 30
    if (startMinutes % 30 !== 0) {
      startMinutes += 30 - (startMinutes % 30);
    }
    // Only include times strictly within the range (not including the end time)
    for (let mins = startMinutes; mins < endMinutes; mins += 30) {
      const hours = Math.floor(mins / 60).toString().padStart(2, '0');
      const minutes = (mins % 60).toString().padStart(2, '0');
      times.push(`${hours}:${minutes}`);
    }
    return times;
  }

  // Remove dropdowns and show info only
  form.innerHTML = `<div style="text-align:center;padding:1em;">To book this slot, please contact the tutor directly.</div>`;
  modal.style.display = 'flex';
}

function parseTime(timeStr) {
  // timeStr: 'HH:MM'
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d;
}

// Auth state listener
onAuthStateChanged(auth, async user => {
  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      profileSetupModal.style.display = 'flex';
      settingsBtn.style.display = 'none';
      currentRole.textContent = roleSelect.value[0].toUpperCase() + roleSelect.value.slice(1);
    } else {
      const userData = userDoc.data();
      settingsBtn.style.display = 'inline-block';
      if (userData.profilePhotoBase64) {
        profilePic.src = userData.profilePhotoBase64;
      }
      // Set the role and name only after we have the user data
      currentRole.textContent = `${roleSelect.value[0].toUpperCase() + roleSelect.value.slice(1)} - ${userData.firstName}`;
    }
    
    signBtn.textContent = 'Sign Out';
    if (!userDoc.exists() || !userDoc.data()?.profilePhotoBase64) {
      profilePic.src = user.photoURL || 'avatar-placeholder.png';
    }
    
    if (roleSelect.value === 'student') {
      studentSection.style.display = 'block';
      tutorSection.style.display = 'none';
      await loadTutorSlots();
    } else {
      studentSection.style.display = 'none';
      tutorSection.style.display = 'block';
      await loadAvailableSlots();
    }
  } else {
    signBtn.textContent = 'Sign In';
    profilePic.src = 'avatar-placeholder.png';
    settingsBtn.style.display = 'none';
    studentSection.style.display = 'none';
    tutorSection.style.display = 'block';
    // Set just the role text when not signed in
    currentRole.textContent = roleSelect.value[0].toUpperCase() + roleSelect.value.slice(1);
  }
});

profileSetupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const userGrade = document.getElementById('user-grade').value;
  const profilePhotoFile = document.getElementById('profile-photo').files[0];
  const neverStudent = document.getElementById('never-student').checked;
  const neverTutor = document.getElementById('never-tutor').checked;
  
  if (!firstName || !lastName || !userGrade || !profilePhotoFile) {
    alert('Please fill in all fields and upload a profile photo');
    return;
  }

  try {
    // Convert image to base64 and resize it
    const photoBase64 = await convertImageToBase64(profilePhotoFile);
    
    // Get selected subjects
    const helpNeededSubjects = [];
    const tutoringSubjects = [];
    
    if (!neverStudent) {
      document.querySelectorAll('input[name="help-subjects"]:checked').forEach(cb => {
        helpNeededSubjects.push(cb.value);
      });
    }
    
    if (!neverTutor) {
      document.querySelectorAll('input[name="tutor-subjects"]:checked').forEach(cb => {
        tutoringSubjects.push(cb.value);
      });
    }
    
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      firstName: firstName,
      lastName: lastName,
      fullName: `${firstName} ${lastName}`,
      grade: parseInt(userGrade),
      profilePhotoBase64: photoBase64,
      helpNeededSubjects: helpNeededSubjects,
      tutoringSubjects: tutoringSubjects,
      neverStudent: neverStudent,
      neverTutor: neverTutor,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    profileSetupModal.style.display = 'none';
    profilePic.src = photoBase64;
    settingsBtn.style.display = 'inline-block';
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('Error saving profile. Please try again.');
  }
});

// Save settings functionality
document.getElementById('save-student-settings')?.addEventListener('click', async () => {
  if (!auth.currentUser) return;
  
  try {
    const neverStudent = document.getElementById('settings-never-student').checked;
    const helpNeededSubjects = [];
    
    if (!neverStudent) {
      document.querySelectorAll('#student-help-subjects input[name="help-subjects"]:checked').forEach(cb => {
        helpNeededSubjects.push(cb.value);
      });
    }
    
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      helpNeededSubjects: helpNeededSubjects,
      neverStudent: neverStudent,
      updatedAt: new Date()
    }, { merge: true });
    
    alert('Student settings saved!');
  } catch (error) {
    console.error('Error saving student settings:', error);
    alert('Error saving settings. Please try again.');
  }
});

document.getElementById('save-tutor-settings')?.addEventListener('click', async () => {
  if (!auth.currentUser) return;
  
  try {
    const neverTutor = document.getElementById('settings-never-tutor').checked;
    const tutoringSubjects = [];
    
    if (!neverTutor) {
      document.querySelectorAll('#tutor-help-subjects input[name="tutor-subjects"]:checked').forEach(cb => {
        tutoringSubjects.push(cb.value);
      });
    }
    
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      tutoringSubjects: tutoringSubjects,
      neverTutor: neverTutor,
      updatedAt: new Date()
    }, { merge: true });
    
    alert('Tutor settings saved!');
  } catch (error) {
    console.error('Error saving tutor settings:', error);
    alert('Error saving settings. Please try again.');
  }
});

// Sign-In / Sign-Out handler
signBtn.addEventListener('click', () => {
  if (auth.currentUser) {
    signOut(auth);
  } else {
    signInWithPopup(auth, provider).catch(console.error);
  }
});
