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

// ...existing code...

// --- My Slots Panel Functionality ---
const mySlotsBtn = document.getElementById('my-slots-btn');
const mySlotsPanel = document.getElementById('my-slots-panel');
const closePanelBtn = document.getElementById('close-slots-panel');
const panelOverlay = document.querySelector('.slots-panel-overlay');
const tutoringSlotsList = document.getElementById('tutoring-slots');
const tutoredSlotsList = document.getElementById('tutored-slots');
const tutoringEmpty = document.getElementById('tutoring-empty');
const tutoredEmpty = document.getElementById('tutored-empty');

// Panel open/close functionality
function openSlotsPanel() {
  mySlotsPanel.classList.add('open');
  mySlotsPanel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
  
  // Focus management
  closePanelBtn.focus();
  
  // Load slots data
  loadMySlotsData();
}

function closeSlotsPanel() {
  mySlotsPanel.classList.remove('open');
  mySlotsPanel.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = ''; // Restore scrolling
  
  // Return focus to the button that opened the panel
  mySlotsBtn.focus();
}

// Event listeners for panel
if (mySlotsBtn) {
  mySlotsBtn.addEventListener('click', openSlotsPanel);
}

if (closePanelBtn) {
  closePanelBtn.addEventListener('click', closeSlotsPanel);
}

if (panelOverlay) {
  panelOverlay.addEventListener('click', closeSlotsPanel);
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (mySlotsPanel.classList.contains('open')) {
    if (e.key === 'Escape') {
      closeSlotsPanel();
    }
  }
  if (myStatsPanel && myStatsPanel.classList.contains('open')) {
    if (e.key === 'Escape') {
      closeStatsPanel();
    }
  }
});

// --- My Stats Panel Functionality ---
const myStatsBtn = document.getElementById('my-stats-btn');
const myStatsPanel = document.getElementById('my-stats-panel');
const closeStatsPanelBtn = document.getElementById('close-stats-panel');
const statsOverlay = document.querySelectorAll('.slots-panel-overlay')[1]; // Second overlay for stats panel

// Panel open/close functionality
function openStatsPanel() {
  myStatsPanel.classList.add('open');
  myStatsPanel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
  
  // Focus management
  closeStatsPanelBtn.focus();
  
  // Load stats data
  loadMyStatsData();
}

function closeStatsPanel() {
  myStatsPanel.classList.remove('open');
  myStatsPanel.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = ''; // Restore scrolling
  
  // Return focus to the button that opened the panel
  myStatsBtn.focus();
}

// Event listeners for stats panel
if (myStatsBtn) {
  myStatsBtn.addEventListener('click', openStatsPanel);
}

if (closeStatsPanelBtn) {
  closeStatsPanelBtn.addEventListener('click', closeStatsPanel);
}

if (statsOverlay) {
  statsOverlay.addEventListener('click', closeStatsPanel);
}

// Function to calculate time difference in hours
function calculateHours(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return (endMinutes - startMinutes) / 60;
}

// Function to load all stats data for the panel
async function loadMyStatsData() {
  if (!auth.currentUser) {
    return;
  }

  try {
    let completedHours = 0;
    let plannedHours = 0;
    const categoryHours = {}; // For subject categories
    const courseHours = {};   // For specific courses
    
    const now = new Date();

    // Fetch booked slots where user is the tutor
    const bookedSlotsRef = collection(db, 'bookedSlots');
    const bookedQuery = query(bookedSlotsRef, where('tutorId', '==', auth.currentUser.uid));
    const bookedSnapshot = await getDocs(bookedQuery);
    
    bookedSnapshot.forEach((doc) => {
      const slotData = doc.data();
      if (slotData.cancelled) return; // Skip cancelled slots
      
      const slotDateTime = new Date(`${slotData.date}T${slotData.startTime}`);
      const hours = calculateHours(slotData.startTime, slotData.endTime);
      
      if (slotDateTime < now) {
        // Completed session
        completedHours += hours;
        
        // Add to category breakdown
        const category = slotData.subjectCategory || 'Other';
        categoryHours[category] = (categoryHours[category] || 0) + hours;
        
        // Add to course breakdown
        const course = slotData.specificSubject || slotData.subject || 'Unknown';
        courseHours[course] = (courseHours[course] || 0) + hours;
      } else {
        // Upcoming session
        plannedHours += hours;
        
        // Also count planned hours in breakdowns
        const category = slotData.subjectCategory || 'Other';
        if (!categoryHours[category]) categoryHours[category] = 0;
        
        const course = slotData.specificSubject || slotData.subject || 'Unknown';
        if (!courseHours[course]) courseHours[course] = 0;
      }
    });

    // Fetch available slots (not yet booked)
    const slotsRef = collection(db, 'slots');
    const slotsQuery = query(slotsRef, where('tutorId', '==', auth.currentUser.uid));
    const slotsSnapshot = await getDocs(slotsQuery);
    
    slotsSnapshot.forEach((doc) => {
      const slotData = doc.data();
      const slotDateTime = new Date(`${slotData.date}T${slotData.startTime}`);
      
      if (slotDateTime >= now) {
        // Future available slot
        const hours = calculateHours(slotData.startTime, slotData.endTime);
        plannedHours += hours;
        
        // Initialize in breakdowns (but don't add hours yet, these are just available)
        const category = slotData.subjectCategory || 'Other';
        if (!categoryHours[category]) categoryHours[category] = 0;
        
        const course = slotData.specificSubject || slotData.subject || 'Unknown';
        if (!courseHours[course]) courseHours[course] = 0;
      }
    });

    // Update the UI
    document.getElementById('completed-hours').textContent = completedHours.toFixed(1);
    document.getElementById('planned-hours').textContent = plannedHours.toFixed(1);
    document.getElementById('total-hours-stat').textContent = (completedHours + plannedHours).toFixed(1);
    
    // Render subject category breakdown
    renderSubjectBreakdown('category-breakdown', categoryHours);
    
    // Render specific course breakdown
    renderSubjectBreakdown('course-breakdown', courseHours);
    
  } catch (error) {
    console.error('Error loading stats:', error);
    document.getElementById('category-breakdown').innerHTML = '<div class="stats-empty">Error loading statistics</div>';
    document.getElementById('course-breakdown').innerHTML = '<div class="stats-empty">Error loading statistics</div>';
  }
}

// Function to render subject breakdown (works for both categories and courses)
function renderSubjectBreakdown(containerId, hoursData) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const entries = Object.entries(hoursData);
  
  if (entries.length === 0) {
    container.innerHTML = `
      <div class="stats-empty">
        <div class="stats-empty-icon">📚</div>
        <p>No tutoring data yet</p>
      </div>
    `;
    return;
  }
  
  // Sort by hours (descending)
  entries.sort((a, b) => b[1] - a[1]);
  
  container.innerHTML = entries.map(([subject, hours]) => `
    <div class="subject-stat-item">
      <div class="subject-stat-name">${subject}</div>
      <div class="subject-stat-hours">
        <div class="subject-stat-value">
          <div class="subject-stat-number">${hours.toFixed(1)}</div>
          <div class="subject-stat-label">Hours</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Keyboard navigation// Function to load all slots data for the panel
async function loadMySlotsData() {
  if (!auth.currentUser) {
    console.log('No user signed in');
    return;
  }

  await Promise.all([
    loadTutoringSlotsForPanel(),
    loadTutoredSlotsForPanel()
  ]);
}

// Function to load slots the user is tutoring
async function loadTutoringSlotsForPanel() {
  if (!tutoringSlotsList) return;
  
  tutoringSlotsList.innerHTML = '<div class="slots-loading">Loading your tutoring slots...</div>';
  
  try {
    const userId = auth.currentUser.uid;
    
    
    // Get booked slots where this user is the tutor
    const bookedSlotsQuery = query(
      collection(db, 'bookedSlots'),
      where('tutorId', '==', userId)
    );
    const bookedSnapshot = await getDocs(bookedSlotsQuery);
    
    const tutoringSlots = [];
    
    
    // Add booked slots where user is tutoring
    bookedSnapshot.forEach(doc => {
      const data = doc.data();
      tutoringSlots.push({
        id: doc.id,
        ...data,
        status: getSlotStatus(data),
        type: 'booked'
      });
    });
    
    // Sort by date - use slotData.date instead of slotData.day
    tutoringSlots.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA - dateB;
    });
    
    if (tutoringSlots.length === 0) {
      tutoringSlotsList.innerHTML = '';
      tutoringEmpty.style.display = 'block';
    } else {
      tutoringEmpty.style.display = 'none';
      renderSlotsInPanel(tutoringSlots, tutoringSlotsList, 'tutoring');
    }
    
  } catch (error) {
    console.error('Error loading tutoring slots:', error);
    tutoringSlotsList.innerHTML = '<div class="slots-loading" style="color: #dc2626;">Error loading tutoring slots</div>';
  }
}

// Function to load slots the user is getting tutored in
async function loadTutoredSlotsForPanel() {
  if (!tutoredSlotsList) return;
  
  tutoredSlotsList.innerHTML = '<div class="slots-loading">Loading your tutored slots...</div>';
  
  try {
    const userId = auth.currentUser.uid;
    
    // Get booked slots where this user is the student
    const bookedSlotsQuery = query(
      collection(db, 'bookedSlots'),
      where('studentUid', '==', userId)
    );
    const bookedSnapshot = await getDocs(bookedSlotsQuery);
    
    const tutoredSlots = [];
    
    bookedSnapshot.forEach(doc => {
      const data = doc.data();
      tutoredSlots.push({
        id: doc.id,
        ...data,
        status: getSlotStatus(data),
        type: 'booked'
      });
    });
    
    // Sort by date - use slotData.date instead of slotData.day
    tutoredSlots.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA - dateB;
    });
    
    if (tutoredSlots.length === 0) {
      tutoredSlotsList.innerHTML = '';
      tutoredEmpty.style.display = 'block';
    } else {
      tutoredEmpty.style.display = 'none';
      renderSlotsInPanel(tutoredSlots, tutoredSlotsList, 'tutored');
    }
    
  } catch (error) {
    console.error('Error loading tutored slots:', error);
    tutoredSlotsList.innerHTML = '<div class="slots-loading" style="color: #dc2626;">Error loading tutored slots</div>';
  }
}

// Function to determine slot status
function getSlotStatus(slotData) {
  const now = new Date();
  // Use slotData.date instead of slotData.day for the date calculation
  const slotDateTime = new Date(`${slotData.date}T${slotData.startTime}`);
  
  if (slotData.cancelled) {
    return 'cancelled';
  } else if (slotDateTime < now) {
    return 'completed';
  } else {
    return 'upcoming';
  }
}

// Function to render slots in the panel
function renderSlotsInPanel(slots, container, userRole) {
  container.innerHTML = '';
  
  slots.forEach(slot => {
    const slotElement = createSlotElement(slot, userRole);
    container.appendChild(slotElement);
  });
}

// Function to create individual slot elements
function createSlotElement(slot, userRole) {
  const slotDiv = document.createElement('div');
  slotDiv.className = 'slot-item';
  
  const counterpartName = userRole === 'tutoring' ? 
    (slot.studentName || 'No student yet') : 
    (slot.tutorName || 'Tutor');
  
  const actionButtons = createActionButtons(slot, userRole);
  
  slotDiv.innerHTML = `
    <div class="slot-item-header">
      <div class="slot-subject">${slot.subject || slot.specificSubject || 'Subject'}</div>
      <div class="slot-status ${slot.status}">${slot.status}</div>
    </div>
    <div class="slot-details">
      <div class="slot-detail">
        <span class="slot-detail-icon">📅</span>
        <span>${formatDate(slot.date)}</span>
      </div>
      <div class="slot-detail">
        <span class="slot-detail-icon">⏰</span>
        <span>${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)}</span>
      </div>
      <div class="slot-detail">
        <span class="slot-detail-icon">📍</span>
        <span>${slot.location}</span>
      </div>
      ${slot.type === 'booked' ? `
        <div class="slot-detail">
          <span class="slot-detail-icon">${userRole === 'tutoring' ? '🎓' : '👨‍🏫'}</span>
          <span>${counterpartName}</span>
        </div>
      ` : ''}
    </div>
    <div class="slot-actions">
      ${actionButtons}
    </div>
  `;
  
  return slotDiv;
}

// Function to create action buttons based on slot and user role
function createActionButtons(slot, userRole) {
  const buttons = [];
  
  // View Details button (functional)
  buttons.push(`<button class="slot-action-btn primary" onclick="viewSlotDetails('${slot.id}', '${slot.type}', '${userRole}')" aria-label="View slot details">View Details</button>`);
  
  if (slot.status === 'upcoming') {
    if (slot.type === 'available') {
      // Available slot actions (for tutors)
      buttons.push(`<button class="slot-action-btn" onclick="showComingSoon('Edit')" aria-label="Edit slot">Edit</button>`);
      buttons.push(`<button class="slot-action-btn" onclick="showComingSoon('Cancel')" aria-label="Cancel slot">Cancel</button>`);
    } else {
      // Booked slot actions
      if (userRole === "student") {
        buttons.push(`<button class="slot-action-btn" onclick="showComingSoon('Cancel')" aria-label="Cancel session">Cancel</button>`);
      }

      if (userRole === 'tutored') {
        buttons.push(`<button class="slot-action-btn" onclick="showComingSoon('Cancel Booking')" aria-label="Cancel booking">Cancel Booking</button>`);
      }
    }
  }
  
  return buttons.join('');
}

// Function to format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Function to show "Coming Soon" message
function showComingSoon(action) {
  alert(`${action} functionality coming soon!`);
}

// Function to view slot details (functional)
function viewSlotDetails(slotId, slotType, userRole) {
  // This will show detailed information about the slot
  const collectionName = slotType === 'available' ? 'slots' : 'bookedSlots';
  
  getDoc(doc(db, collectionName, slotId)).then(docSnap => {
    if (docSnap.exists()) {
      const slotData = docSnap.data();
      showSlotDetailsModal(slotData, userRole);
    } else {
      alert('Slot not found.');
    }
  }).catch(error => {
    console.error('Error fetching slot details:', error);
    alert('Error loading slot details.');
  });
}

// Function to show slot details in a modal
function showSlotDetailsModal(slotData, userRole) {
  const modalHtml = `
    <div class="modal" style="display: flex;">
      <div class="modal-content">
        <h2>Slot Details</h2>
        <div style="margin: 1rem 0;">
          <p><strong>Subject:</strong> ${slotData.subject || slotData.specificSubject}</p>
          <p><strong>Date:</strong> ${formatDate(slotData.day)}</p>
          <p><strong>Time:</strong> ${formatTimeDisplay(slotData.startTime)} - ${formatTimeDisplay(slotData.endTime)}</p>
          <p><strong>Location:</strong> ${slotData.location}</p>
          ${slotData.tutorName ? `<p><strong>Tutor:</strong> ${slotData.tutorName}</p>` : ''}
          ${slotData.studentName ? `<p><strong>Student:</strong> ${slotData.studentName}</p>` : ''}
          ${slotData.studentEmail ? `<p><strong>Student Email:</strong> ${slotData.studentEmail}</p>` : ''}
          <p><strong>Status:</strong> ${getSlotStatus(slotData)}</p>
        </div>
        <button onclick="this.closest('.modal').remove()" style="background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    </div>
  `;
  
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHtml;
  document.body.appendChild(modalDiv.firstElementChild);
}

// Make functions globally accessible
window.viewSlotDetails = viewSlotDetails;
window.showComingSoon = showComingSoon;

// --- Events System ---
const eventsSection = document.getElementById('events-section');
const eventCoordinatorPanel = document.getElementById('event-coordinator-panel');
const createEventForm = document.getElementById('create-event-form');
const eventsGrid = document.getElementById('events-grid');
const coordinatorEventsGrid = document.getElementById('coordinator-events-grid');
const eventFilterCategory = document.getElementById('event-filter-category');
const eventFilterTime = document.getElementById('event-filter-time');

// Function to create an event
async function createEvent(eventData) {
  try {
    const eventsRef = collection(db, 'events');
    const docRef = await addDoc(eventsRef, {
      ...eventData,
      createdAt: Timestamp.now(),
      createdBy: auth.currentUser.uid,
      creatorEmail: auth.currentUser.email,
      creatorName: `${eventData.creatorFirstName} ${eventData.creatorLastName}`,
      attendees: [],
      cancelled: false
    });
    
    console.log('Event created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

// Function to load events
async function loadEvents(categoryFilter = '', timeFilter = 'upcoming') {
  if (!eventsGrid) return;
  
  eventsGrid.innerHTML = '<div class="slots-loading">Loading events...</div>';
  
  try {
    const eventsRef = collection(db, 'events');
    let q = query(eventsRef, where('cancelled', '==', false));
    
    if (categoryFilter) {
      q = query(eventsRef, where('cancelled', '==', false), where('category', '==', categoryFilter));
    }
    
    const snapshot = await getDocs(q);
    let events = [];
    
    snapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });
    
    // Filter by time
    const now = new Date();
    events = events.filter(event => {
      const eventDateTime = new Date(`${event.date}T${event.startTime}`);
      
      if (timeFilter === 'upcoming') {
        return eventDateTime >= now;
      } else if (timeFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return eventDateTime >= today && eventDateTime < tomorrow;
      } else if (timeFilter === 'this-week') {
        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return eventDateTime >= now && eventDateTime <= weekFromNow;
      } else if (timeFilter === 'this-month') {
        const monthFromNow = new Date(now);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        return eventDateTime >= now && eventDateTime <= monthFromNow;
      }
      return true;
    });
    
    // Sort by date
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA - dateB;
    });
    
    if (events.length === 0) {
      eventsGrid.innerHTML = `
        <div class="no-events-message">
          <div class="no-events-icon">📅</div>
          <h3>No events found</h3>
          <p>Check back later for upcoming events!</p>
        </div>
      `;
      return;
    }
    
    eventsGrid.innerHTML = events.map(event => createEventCard(event)).join('');
    
  } catch (error) {
    console.error('Error loading events:', error);
    eventsGrid.innerHTML = '<div class="error">Error loading events. Please try again.</div>';
  }
}

// Function to load coordinator's events
async function loadCoordinatorEvents() {
  if (!coordinatorEventsGrid || !auth.currentUser) return;
  
  coordinatorEventsGrid.innerHTML = '<div class="slots-loading">Loading your events...</div>';
  
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('createdBy', '==', auth.currentUser.uid));
    
    const snapshot = await getDocs(q);
    let events = [];
    
    snapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by date
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA - dateB;
    });
    
    if (events.length === 0) {
      coordinatorEventsGrid.innerHTML = `
        <div class="no-events-message">
          <div class="no-events-icon">🎯</div>
          <h3>You haven't created any events yet</h3>
          <p>Use the form above to create your first event!</p>
        </div>
      `;
      return;
    }
    
    coordinatorEventsGrid.innerHTML = events.map(event => createEventCard(event, true)).join('');
    
  } catch (error) {
    console.error('Error loading coordinator events:', error);
    coordinatorEventsGrid.innerHTML = '<div class="error">Error loading events. Please try again.</div>';
  }
}

// Function to create event card HTML
function createEventCard(event, isCoordinator = false) {
  const isUserRegistered = auth.currentUser && event.attendees?.includes(auth.currentUser.uid);
  const isFull = event.maxAttendees && event.attendees?.length >= event.maxAttendees;
  const eventDateTime = new Date(`${event.date}T${event.startTime}`);
  const isPast = eventDateTime < new Date();
  
  let actionButtons = '';
  
  if (isCoordinator) {
    actionButtons = `
      <button class="event-btn delete-event-btn" onclick="deleteEvent('${event.id}')">Delete Event</button>
    `;
  } else if (isPast) {
    actionButtons = '<div class="event-full-badge">Event Ended</div>';
  } else if (isUserRegistered) {
    actionButtons = `
      <div class="event-registered-badge">
        <span>✓</span> You're registered
      </div>
      <button class="event-btn cancel-rsvp-btn" onclick="cancelRSVP('${event.id}')">Cancel RSVP</button>
    `;
  } else if (isFull) {
    actionButtons = '<div class="event-full-badge">Event Full</div>';
  } else {
    actionButtons = `
      <button class="event-btn rsvp-btn" onclick="rsvpToEvent('${event.id}')">RSVP</button>
    `;
  }
  
  return `
    <div class="event-card">
      <div class="event-category-badge category-${event.category}">${event.category.replace('-', ' ')}</div>
      <h3>${event.title}</h3>
      <p class="event-description">${event.description}</p>
      
      <div class="event-details">
        <div class="event-detail-item">
          <span class="event-detail-icon">📅</span>
          <span>${formatDate(event.date)}</span>
        </div>
        <div class="event-detail-item">
          <span class="event-detail-icon">⏰</span>
          <span>${formatTimeDisplay(event.startTime)} - ${formatTimeDisplay(event.endTime)}</span>
        </div>
        <div class="event-detail-item">
          <span class="event-detail-icon">📍</span>
          <span>${event.location}</span>
        </div>
        <div class="event-detail-item">
          <span class="event-detail-icon">👤</span>
          <span>Organized by ${event.creatorName}</span>
        </div>
      </div>
      
      <div class="event-attendee-info">
        <span class="attendee-count">${event.attendees?.length || 0}</span>
        <span>${event.maxAttendees ? `/ ${event.maxAttendees}` : ''} ${event.attendees?.length === 1 ? 'person' : 'people'} registered</span>
      </div>
      
      <div class="event-actions">
        ${actionButtons}
      </div>
    </div>
  `;
}

// Function to RSVP to an event
async function rsvpToEvent(eventId) {
  if (!auth.currentUser) {
    alert('Please sign in to RSVP to events');
    return;
  }
  
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (!eventDoc.exists()) {
      alert('Event not found');
      return;
    }
    
    const eventData = eventDoc.data();
    const attendees = eventData.attendees || [];
    
    // Check if already registered
    if (attendees.includes(auth.currentUser.uid)) {
      alert('You are already registered for this event');
      return;
    }
    
    // Check if event is full
    if (eventData.maxAttendees && attendees.length >= eventData.maxAttendees) {
      alert('Sorry, this event is full');
      return;
    }
    
    // Add user to attendees
    attendees.push(auth.currentUser.uid);
    await setDoc(eventRef, { attendees }, { merge: true });
    
    alert('Successfully registered for the event!');
    loadEvents(eventFilterCategory?.value || '', eventFilterTime?.value || 'upcoming');
    
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    alert('Failed to RSVP. Please try again.');
  }
}

// Function to cancel RSVP
async function cancelRSVP(eventId) {
  if (!auth.currentUser) return;
  
  if (!confirm('Are you sure you want to cancel your RSVP?')) return;
  
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (!eventDoc.exists()) {
      alert('Event not found');
      return;
    }
    
    const eventData = eventDoc.data();
    const attendees = eventData.attendees || [];
    
    // Remove user from attendees
    const updatedAttendees = attendees.filter(uid => uid !== auth.currentUser.uid);
    await setDoc(eventRef, { attendees: updatedAttendees }, { merge: true });
    
    alert('RSVP cancelled');
    loadEvents(eventFilterCategory?.value || '', eventFilterTime?.value || 'upcoming');
    
  } catch (error) {
    console.error('Error cancelling RSVP:', error);
    alert('Failed to cancel RSVP. Please try again.');
  }
}

// Function to delete event
async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
  
  try {
    await deleteDoc(doc(db, 'events', eventId));
    alert('Event deleted successfully');
    loadCoordinatorEvents();
    loadEvents(eventFilterCategory?.value || '', eventFilterTime?.value || 'upcoming');
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event. Please try again.');
  }
}

// Event form submission
if (createEventForm) {
  createEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      alert('Please sign in to create events');
      return;
    }
    
    // Get user profile for creator name
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data() || {};
    
    const eventData = {
      title: document.getElementById('event-title').value.trim(),
      category: document.getElementById('event-category').value,
      description: document.getElementById('event-description').value.trim(),
      date: document.getElementById('event-date').value,
      startTime: document.getElementById('event-start-time').value,
      endTime: document.getElementById('event-end-time').value,
      location: document.getElementById('event-location').value.trim(),
      maxAttendees: parseInt(document.getElementById('event-max-attendees').value) || null
    };
    
    // Validate dates
    const eventDateTime = new Date(`${eventData.date}T${eventData.startTime}`);
    const now = new Date();
    
    if (eventDateTime < now) {
      alert('Event date and time must be in the future');
      return;
    }
    
    // Validate times
    if (eventData.startTime >= eventData.endTime) {
      alert('End time must be after start time');
      return;
    }
    
    try {
      // Debug: Log user info
      console.log('Current user email:', auth.currentUser.email);
      console.log('Current user UID:', auth.currentUser.uid);
      console.log('Is event coordinator?', isEventCoordinator(auth.currentUser.email));
      console.log('Is admin?', isAdmin(auth.currentUser.email));
      
      // Create event with proper creator name from Firestore user data
      await addDoc(collection(db, 'events'), {
        ...eventData,
        createdAt: Timestamp.now(),
        createdBy: auth.currentUser.uid,
        creatorEmail: auth.currentUser.email,
        creatorName: `${userData.firstName || 'Unknown'} ${userData.lastName || 'User'}`,
        attendees: [],
        cancelled: false
      });
      
      alert('Event created successfully!');
      createEventForm.reset();
      loadCoordinatorEvents();
      loadEvents(eventFilterCategory?.value || '', eventFilterTime?.value || 'upcoming');
    } catch (error) {
      console.error('Error creating event:', error);
      console.error('Full error object:', error);
      alert(`Failed to create event: ${error.message}\n\nCheck the browser console for more details.`);
    }
  });
}

// Event filters
if (eventFilterCategory) {
  eventFilterCategory.addEventListener('change', () => {
    loadEvents(eventFilterCategory.value, eventFilterTime?.value || 'upcoming');
  });
}

if (eventFilterTime) {
  eventFilterTime.addEventListener('change', () => {
    loadEvents(eventFilterCategory?.value || '', eventFilterTime.value);
  });
}

// Make event functions globally accessible
window.rsvpToEvent = rsvpToEvent;
window.cancelRSVP = cancelRSVP;
window.deleteEvent = deleteEvent;

// Admin Panel Variables and Functions
let currentAdminView = 'monthly';
let currentAdminPeriod = new Date();

// Function to load admin dashboard data
async function loadAdminDashboard() {
  if (!auth.currentUser || !isAdmin(auth.currentUser.email)) {
    return;
  }

  try {
    await updateAdminStats();
    await updateAdminCharts();
    await updateAdminTables();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

// Function to get date range based on current view and period
function getDateRange() {
  const start = new Date(currentAdminPeriod);
  const end = new Date(currentAdminPeriod);
  
  if (currentAdminView === 'weekly') {
    // Get start of week (Sunday)
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    // Get end of week (Saturday)
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (currentAdminView === 'monthly') {
    // Get start of month
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    // Get end of month
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  } else if (currentAdminView === 'yearly') {
    // Get start of year
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    // Get end of year
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }
  
  return { start, end };
}

// Function to update period display
function updatePeriodDisplay() {
  const periodDisplay = document.getElementById('current-period');
  if (!periodDisplay) return;
  
  if (currentAdminView === 'weekly') {
    const { start, end } = getDateRange();
    periodDisplay.textContent = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (currentAdminView === 'monthly') {
    periodDisplay.textContent = currentAdminPeriod.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else if (currentAdminView === 'yearly') {
    periodDisplay.textContent = currentAdminPeriod.getFullYear().toString();
  }
}

// Function to fetch sessions within date range
async function fetchSessionsInRange() {
  const { start, end } = getDateRange();
  const bookedSlotsRef = collection(db, 'bookedSlots');
  
  try {
    const snapshot = await getDocs(bookedSlotsRef);
    const sessions = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const sessionDate = new Date(`${data.date || data.day}T${data.startTime}`);
      
      if (sessionDate >= start && sessionDate <= end && !data.cancelled) {
        sessions.push({
          id: doc.id,
          ...data,
          sessionDate
        });
      }
    });
    
    return sessions;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

// Function to update admin statistics
async function updateAdminStats() {
  const sessions = await fetchSessionsInRange();
  
  // Calculate total sessions
  document.getElementById('total-sessions').textContent = sessions.length;
  
  // Calculate unique students
  const uniqueStudents = new Set(sessions.map(s => s.studentEmail).filter(Boolean));
  document.getElementById('unique-students').textContent = uniqueStudents.size;
  
  // Calculate unique tutors
  const uniqueTutors = new Set(sessions.map(s => s.tutorEmail).filter(Boolean));
  document.getElementById('unique-tutors').textContent = uniqueTutors.size;
  
  // Calculate total hours
  let totalMinutes = 0;
  sessions.forEach(session => {
    const start = parseTime(session.startTime);
    const end = parseTime(session.endTime);
    if (start && end) {
      totalMinutes += (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
    }
  });
  document.getElementById('total-hours').textContent = (totalMinutes / 60).toFixed(1);
}

// Function to update admin charts
async function updateAdminCharts() {
  const sessions = await fetchSessionsInRange();
  
  // Update subject chart
  const subjectCounts = {};
  sessions.forEach(session => {
    const subject = session.subject || session.specificSubject || 'Unknown';
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
  });
  
  renderSubjectChart(subjectCounts);
  renderTimelineChart(sessions);
}

// Function to render subject chart
function renderSubjectChart(subjectCounts) {
  const chartDiv = document.getElementById('subject-chart');
  if (!chartDiv) return;
  
  const sortedSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (sortedSubjects.length === 0) {
    chartDiv.innerHTML = '<div class="empty-data"><div class="empty-data-icon">📊</div><p>No data available for this period</p></div>';
    return;
  }
  
  const maxCount = Math.max(...sortedSubjects.map(([_, count]) => count));
  
  chartDiv.innerHTML = sortedSubjects.map(([subject, count]) => {
    const percentage = (count / maxCount) * 100;
    return `
      <div class="chart-bar-container">
        <div class="chart-label">${subject}</div>
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="width: ${percentage}%"></div>
          <div class="chart-value">${count}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Function to render timeline chart
function renderTimelineChart(sessions) {
  const chartDiv = document.getElementById('timeline-chart');
  if (!chartDiv) return;
  
  let timeData = {};
  let labels = [];
  
  if (currentAdminView === 'weekly') {
    // Group by day of week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => timeData[day] = 0);
    
    sessions.forEach(session => {
      const dayIndex = session.sessionDate.getDay();
      timeData[days[dayIndex]]++;
    });
    labels = days;
  } else if (currentAdminView === 'monthly') {
    // Group by week
    const { start, end } = getDateRange();
    const weeks = Math.ceil((end.getDate()) / 7);
    
    for (let i = 1; i <= weeks; i++) {
      timeData[`W${i}`] = 0;
    }
    
    sessions.forEach(session => {
      const weekNum = Math.ceil(session.sessionDate.getDate() / 7);
      timeData[`W${weekNum}`]++;
    });
    labels = Object.keys(timeData);
  } else if (currentAdminView === 'yearly') {
    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(month => timeData[month] = 0);
    
    sessions.forEach(session => {
      const monthIndex = session.sessionDate.getMonth();
      timeData[months[monthIndex]]++;
    });
    labels = months;
  }
  
  if (Object.values(timeData).every(v => v === 0)) {
    chartDiv.innerHTML = '<div class="empty-data"><div class="empty-data-icon">📈</div><p>No sessions recorded for this period</p></div>';
    return;
  }
  
  const maxCount = Math.max(...Object.values(timeData), 1);
  
  chartDiv.innerHTML = `
    <div class="timeline-chart">
      ${labels.map(label => {
        const count = timeData[label];
        const heightPercentage = (count / maxCount) * 100;
        return `<div class="timeline-bar" style="height: ${heightPercentage}%" title="${label}: ${count} sessions"></div>`;
      }).join('')}
    </div>
    <div class="timeline-label">
      ${labels.map(label => `<span>${label}</span>`).join('')}
    </div>
  `;
}

// Function to update admin tables
async function updateAdminTables() {
  const sessions = await fetchSessionsInRange();
  
  // Update top subjects table
  const subjectCounts = {};
  sessions.forEach(session => {
    const subject = session.subject || session.specificSubject || 'Unknown';
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
  });
  
  const topSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const topSubjectsDiv = document.getElementById('top-subjects-table');
  if (topSubjectsDiv) {
    if (topSubjects.length === 0) {
      topSubjectsDiv.innerHTML = '<div class="empty-data"><p>No subjects data available</p></div>';
    } else {
      topSubjectsDiv.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Subject</th>
              <th>Sessions</th>
            </tr>
          </thead>
          <tbody>
            ${topSubjects.map(([subject, count], index) => `
              <tr>
                <td>${index + 1}</td>
                <td><span class="subject-badge">${subject}</span></td>
                <td>${count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }
  
  // Update recent sessions table
  const recentSessions = sessions
    .sort((a, b) => b.sessionDate - a.sessionDate)
    .slice(0, 10);
  
  const recentSessionsDiv = document.getElementById('recent-sessions-table');
  if (recentSessionsDiv) {
    if (recentSessions.length === 0) {
      recentSessionsDiv.innerHTML = '<div class="empty-data"><p>No recent sessions</p></div>';
    } else {
      recentSessionsDiv.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Tutor</th>
              <th>Student</th>
            </tr>
          </thead>
          <tbody>
            ${recentSessions.map(session => `
              <tr>
                <td>${formatDate(session.date || session.day)}</td>
                <td><span class="subject-badge">${session.subject || session.specificSubject || 'N/A'}</span></td>
                <td>${session.tutorName || 'N/A'}</td>
                <td>${session.studentName || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }
}

// Event listeners for admin panel
document.addEventListener('DOMContentLoaded', () => {
  // View selector buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAdminView = btn.dataset.view;
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAdminPeriod = new Date(); // Reset to current period
      updatePeriodDisplay();
      loadAdminDashboard();
    });
  });
  
  // Period navigation
  document.getElementById('prev-period')?.addEventListener('click', () => {
    if (currentAdminView === 'weekly') {
      currentAdminPeriod.setDate(currentAdminPeriod.getDate() - 7);
    } else if (currentAdminView === 'monthly') {
      currentAdminPeriod.setMonth(currentAdminPeriod.getMonth() - 1);
    } else if (currentAdminView === 'yearly') {
      currentAdminPeriod.setFullYear(currentAdminPeriod.getFullYear() - 1);
    }
    updatePeriodDisplay();
    loadAdminDashboard();
  });
  
  document.getElementById('next-period')?.addEventListener('click', () => {
    if (currentAdminView === 'weekly') {
      currentAdminPeriod.setDate(currentAdminPeriod.getDate() + 7);
    } else if (currentAdminView === 'monthly') {
      currentAdminPeriod.setMonth(currentAdminPeriod.getMonth() + 1);
    } else if (currentAdminView === 'yearly') {
      currentAdminPeriod.setFullYear(currentAdminPeriod.getFullYear() + 1);
    }
    updatePeriodDisplay();
    loadAdminDashboard();
  });
});

// Test function for Google Sheets (for debugging)
window.testGoogleSheets = async function() {
  console.log('Testing Google Sheets configuration...');
  console.log('Configuration:', {
    apiKey: GOOGLE_SHEETS_CONFIG.apiKey ? 'Present' : 'Missing',
    spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId ? 'Present' : 'Missing',
    range: GOOGLE_SHEETS_CONFIG.range,
    isConfigured: isGoogleSheetsConfigured()
  });
  
  const testData = {
    tutorName: 'Test Tutor',
    tutorEmail: 'tutor@test.com',
    studentName: 'Test Student', 
    studentEmail: 'student@test.com',
    subject: 'Test Subject',
    day: '2025-10-04',
    startTime: '10:00',
    endTime: '11:00',
    location: 'Test Location'
  };
  
  const result = await writeBookingToGoogleSheets(testData);
  console.log('Test result:', result);
  return result;
};

// Google Sheets API configuration
// SETUP INSTRUCTIONS:
// 1. Go to Google Cloud Console (console.cloud.google.com)
// 2. Create a new project or select existing project
// 3. Enable Google Sheets API
// 4. Create credentials (API Key) with proper restrictions
// 5. Create a Google Sheet and get its ID from the URL
// 6. Make sure the sheet has a tab called "Bookings" with headers in row 1:
//    A1: Timestamp, B1: Tutor Name, C1: Tutor Email, D1: Student Name, E1: Student Email,
//    F1: Subject, G1: Date, H1: Start Time, I1: End Time, J1: Location
// 7. Make the sheet publicly viewable or share with your service account
const GOOGLE_SHEETS_CONFIG = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbz3vbMOOIYNTHHM9m1YCSyK9bMGHG8xGUbWOlexea7KSHM-NbbFch1NaULzHyiikTpL/exec' // Paste the URL from Apps Script deployment
};

// Admin Configuration
const ADMIN_EMAILS = [
  'adityavshah10@gmail.com'
  // Add more admin emails here
];

// Event Coordinator Configuration
const EVENT_COORDINATOR_EMAILS = [
  'adityavshah1018work@gmail.com'
  // Add more event coordinator emails here
];

// Function to check if user is admin
function isAdmin(userEmail) {
  return ADMIN_EMAILS.includes(userEmail?.toLowerCase());
}

// Function to check if user is event coordinator
function isEventCoordinator(userEmail) {
  return EVENT_COORDINATOR_EMAILS.includes(userEmail?.toLowerCase());
}

// Function to check if Google Sheets is properly configured
function isGoogleSheetsConfigured() {
  return GOOGLE_SHEETS_CONFIG.apiKey && GOOGLE_SHEETS_CONFIG.apiKey.length > 10 && 
         GOOGLE_SHEETS_CONFIG.spreadsheetId && GOOGLE_SHEETS_CONFIG.spreadsheetId.length > 10 &&
         GOOGLE_SHEETS_CONFIG.apiKey !== 'YOUR_API_KEY_HERE' && 
         GOOGLE_SHEETS_CONFIG.spreadsheetId !== 'YOUR_SPREADSHEET_ID_HERE';
}

async function writeBookingToGoogleSheets(bookingData) {
  try {
    const response = await fetch(GOOGLE_SHEETS_CONFIG.webAppUrl, {
      method: 'POST',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        tutorName: bookingData.tutorName || 'N/A',
        tutorEmail: bookingData.tutorEmail || 'N/A',
        studentName: bookingData.studentName || 'N/A',
        studentEmail: bookingData.studentEmail || 'N/A',
        subject: bookingData.subject || 'N/A',
        date: bookingData.date || 'N/A',
        startTime: bookingData.startTime || 'N/A',
        endTime: bookingData.endTime || 'N/A',
        location: bookingData.location || 'N/A'
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log('Successfully wrote booking to Google Sheets');
    } else {
      console.error('Google Sheets write failed:', result.error);
    }
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
  }
}

// Function to initialize Google Sheets (create headers if sheet is empty)
async function initializeGoogleSheetsHeaders() {
  if (!isGoogleSheetsConfigured()) {
    return false;
  }

  try {
    const headers = [
      'Timestamp',
      'Tutor Name',
      'Tutor Email',
      'Student Name',
      'Student Email',
      'Subject',
      'Date',
      'Start Time',
      'End Time',
      'Location'
    ];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/Bookings!A1:J1?key=${GOOGLE_SHEETS_CONFIG.apiKey}`
    );

    if (response.ok) {
      const result = await response.json();
      // If no values or empty, add headers
      if (!result.values || result.values.length === 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/Bookings!A1:J1?valueInputOption=RAW&key=${GOOGLE_SHEETS_CONFIG.apiKey}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [headers]
            })
          }
        );
        console.log('Google Sheets headers initialized');
      }
    }
    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets headers:', error);
    return false;
  }
}

// ...existing code...
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
const tutorSearchInput = document.getElementById('tutor-search-input');
const searchSuggestions = document.getElementById('search-suggestions');

// Make selectedCalendarDate global so all functions can access it
let selectedCalendarDate = '';
let currentSearchTerm = '';
let highlightedSuggestion = -1;

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
  // Subject checkboxes removed from profile setup
  
  // --- Custom Calendar for Slot Form ---
  const slotCalendarContainer = document.getElementById('custom-calendar-container');
  const dateInput = document.getElementById('slot-date');
  const dateWarning = document.getElementById('date-warning');
  let selectedDate = null;
  // Track current calendar month/year for navigation
  let calendarView = null;

  function getMinMaxDates() {
    const today = new Date();
    const min = new Date(today);
    min.setDate(today.getDate() + 2);
    const max = new Date(today);
    max.setDate(today.getDate() + 14);
    return { min, max };
  }

  function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
  }

  function renderCustomCalendar(selected) {
    const { min, max } = getMinMaxDates();
    // Use calendarView if set, else use selected/min
    let current;
    if (calendarView) {
      current = new Date(calendarView);
    } else if (selected) {
      current = new Date(selected);
    } else {
      current = new Date(min);
    }
    current.setDate(1);
    let month = current.getMonth();
    let year = current.getFullYear();
    // Persist current view for navigation
    calendarView = new Date(current);

    // Clamp to min/max month if needed
    const minMonth = min.getMonth();
    const minYear = min.getFullYear();
    const maxMonth = max.getMonth();
    const maxYear = max.getFullYear();

    // Calendar header
    let html = `<div class="custom-calendar">
      <div class="custom-calendar-header">
        <button type="button" id="cal-prev" ${year === minYear && month === minMonth ? 'disabled' : ''}>&lt;</button>
        <span>${current.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        <button type="button" id="cal-next" ${year === maxYear && month === maxMonth ? 'disabled' : ''}>&gt;</button>
      </div>
      <div class="custom-calendar-days">
        <div class="custom-calendar-day">Su</div>
        <div class="custom-calendar-day">Mo</div>
        <div class="custom-calendar-day">Tu</div>
        <div class="custom-calendar-day">We</div>
        <div class="custom-calendar-day">Th</div>
        <div class="custom-calendar-day">Fr</div>
        <div class="custom-calendar-day">Sa</div>
      </div>
      <div class="custom-calendar-days">`;
    let firstDay = new Date(year, month, 1).getDay();
    let daysInMonth = new Date(year, month + 1, 0).getDate();
    let d = 1;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          html += `<div></div>`;
        } else if (d > daysInMonth) {
          html += `<div></div>`;
        } else {
          let thisDate = new Date(year, month, d);
          let dateStr = formatDateForInput(thisDate);
          let disabled = thisDate < min || thisDate > max;
          let selectedClass = selected && dateStr === selected ? 'selected' : '';
          html += `<div class="custom-calendar-date ${selectedClass} ${disabled ? 'disabled' : ''}" data-date="${dateStr}" ${disabled ? 'tabindex="-1"' : 'tabindex="0"'}>${d}</div>`;
          d++;
        }
      }
      if (d > daysInMonth) break;
    }
    html += `</div></div>`;
  slotCalendarContainer.innerHTML = html;

  // Navigation (attach after DOM update)
  const prevBtn = slotCalendarContainer.querySelector('#cal-prev');
  const nextBtn = slotCalendarContainer.querySelector('#cal-next');
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let prevMonth = new Date(year, month - 1, 1);
      calendarView = prevMonth;
      renderCustomCalendar(selectedDate);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let nextMonth = new Date(year, month + 1, 1);
      calendarView = nextMonth;
      renderCustomCalendar(selectedDate);
    });
  }

  // Date selection and hover (event delegation for robustness)
  slotCalendarContainer.querySelector('.custom-calendar-days:last-child')?.addEventListener('click', function(e) {
    const el = e.target.closest('.custom-calendar-date');
    if (el && !el.classList.contains('disabled')) {
      selectedDate = el.getAttribute('data-date');
      dateInput.value = selectedDate;
      // When selecting a date, set calendarView to that month
      calendarView = new Date(selectedDate);
      renderCustomCalendar(selectedDate);
      dateWarning.style.display = 'none';
    }
  });
  slotCalendarContainer.querySelector('.custom-calendar-days:last-child')?.addEventListener('mouseover', function(e) {
    const el = e.target.closest('.custom-calendar-date');
    if (el && !el.classList.contains('disabled') && !el.classList.contains('selected')) {
      el.style.background = 'var(--primary)';
      el.style.color = '#fff';
    }
  });
  slotCalendarContainer.querySelector('.custom-calendar-days:last-child')?.addEventListener('mouseout', function(e) {
    const el = e.target.closest('.custom-calendar-date');
    if (el && !el.classList.contains('disabled') && !el.classList.contains('selected')) {
      el.style.background = '';
      el.style.color = '';
    }
  });
  }

  // Initial render
  calendarView = null;
  renderCustomCalendar();

  // --- Time Dropdown for Slot Form ---
  function populateStartTimeDropdown() {
    const startTimeSelect = document.getElementById('start-time');
    if (!startTimeSelect) return;
    startTimeSelect.innerHTML = '';
    // 6:00 AM to 8:00 AM
    for (let h = 6; h <= 8; h++) {
      for (let m of [0, 30]) {
        if (h === 8 && m > 0) continue;
        let hour = h;
        let ampm = 'AM';
        let label = `${hour}:${m === 0 ? '00' : '30'} ${ampm}`;
        let value = `${hour.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
        startTimeSelect.innerHTML += `<option value="${value}">${label}</option>`;
      }
    }
    // 4:00 PM to 9:00 PM
    for (let h = 16; h <= 21; h++) {
      for (let m of [0, 30]) {
        if (h === 21 && m > 0) continue;
        let hour = h > 12 ? h - 12 : h;
        let ampm = 'PM';
        let label = `${hour}:${m === 0 ? '00' : '30'} ${ampm}`;
        let value = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
        startTimeSelect.innerHTML += `<option value="${value}">${label}</option>`;
      }
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

  // --- Date validation for slot form ---
  function validateDateInput() {
    const { min, max } = getMinMaxDates();
    if (!dateInput.value) {
      dateWarning.textContent = 'Please select a date.';
      dateWarning.style.display = 'block';
      return false;
    }
    const selected = new Date(dateInput.value);
    if (selected < min || selected > max) {
      dateWarning.textContent = `Date must be between ${formatDateForInput(min)} and ${formatDateForInput(max)}.`;
      dateWarning.style.display = 'block';
      return false;
    }
    dateWarning.style.display = 'none';
    return true;
  }

  // Validate on form submit
  const slotForm = document.getElementById('slot-form');
  slotForm.addEventListener('submit', (e) => {
    if (!validateDateInput()) {
      e.preventDefault();
      return false;
    }
  });

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
  const formSpecificSubjectContainer = document.getElementById('form-specific-subject-container');
  const formSpecificSubject = document.getElementById('form-specific-subject');
  const formLanguageLevelContainer = document.getElementById('form-language-level-container');
  const formLanguageLevel = document.getElementById('form-language-level');
  
  formSpecificSubject.innerHTML = '<option value="">Select Specific Course</option>';
  
  if (category && subjectData[category]) {
    formSpecificSubjectContainer.style.display = 'block';
    
    subjectData[category].forEach(course => {
      const option = document.createElement('option');
      option.value = course;
      option.textContent = course;
      formSpecificSubject.appendChild(option);
    });
    
    // Show language level dropdown for languages
    if (category === 'languages') {
      formLanguageLevelContainer.style.display = 'block';
      formLanguageLevel.required = true;
    } else {
      formLanguageLevelContainer.style.display = 'none';
      formLanguageLevel.required = false;
    }
  } else {
    formSpecificSubjectContainer.style.display = 'none';
    formLanguageLevelContainer.style.display = 'none';
    formLanguageLevel.required = false;
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

// Search functionality for tutor subjects
if (tutorSearchInput && searchSuggestions) {
  // Generate all possible search options
  function generateSearchOptions() {
    const options = [];
    
    // Add categories
    Object.keys(subjectData).forEach(category => {
      options.push({
        type: 'category',
        text: category.charAt(0).toUpperCase() + category.slice(1),
        value: category,
        category: category
      });
      
      // Add specific subjects
      subjectData[category].forEach(subject => {
        options.push({
          type: 'subject',
          text: subject,
          value: subject,
          category: category
        });
        
        // Add language levels for language subjects
        if (category === 'languages') {
          const levels = ['1', '2', '3', '4', '5', 'AP'];
          levels.forEach(level => {
            options.push({
              type: 'subject_with_level',
              text: `${subject} Level ${level}`,
              value: `${subject} Level ${level}`,
              category: category,
              subject: subject,
              level: level
            });
          });
        }
      });
    });
    
    return options;
  }
  
  const searchOptions = generateSearchOptions();
  
  // Filter and display suggestions
  function showSuggestions(query) {
    if (!query.trim()) {
      searchSuggestions.classList.remove('show');
      highlightedSuggestion = -1;
      return;
    }
    
    const filtered = searchOptions.filter(option => 
      option.text.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
    
    if (filtered.length === 0) {
      searchSuggestions.classList.remove('show');
      return;
    }
    
    searchSuggestions.innerHTML = filtered.map((option, index) => {
      const highlightedText = option.text.replace(
        new RegExp(`(${query})`, 'gi'),
        '<span class="suggestion-match">$1</span>'
      );
      
      return `
        <div class="suggestion-item" data-index="${index}" data-value="${option.value}" data-type="${option.type}">
          <span class="suggestion-category">${option.category}</span>
          <span class="suggestion-text">${highlightedText}</span>
        </div>
      `;
    }).join('');
    
    searchSuggestions.classList.add('show');
    highlightedSuggestion = -1;
  }
  
  // Handle input events
  tutorSearchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value;
    showSuggestions(currentSearchTerm);
  });
  
  // Handle keyboard navigation
  tutorSearchInput.addEventListener('keydown', (e) => {
    const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedSuggestion = Math.min(highlightedSuggestion + 1, suggestions.length - 1);
      updateHighlight(suggestions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedSuggestion = Math.max(highlightedSuggestion - 1, -1);
      updateHighlight(suggestions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedSuggestion >= 0 && suggestions[highlightedSuggestion]) {
        selectSuggestion(suggestions[highlightedSuggestion]);
      } else {
        // Search with current input value
        loadAvailableSlots();
        searchSuggestions.classList.remove('show');
      }
    } else if (e.key === 'Escape') {
      searchSuggestions.classList.remove('show');
      highlightedSuggestion = -1;
    }
  });
  
  // Handle suggestion clicks
  searchSuggestions.addEventListener('click', (e) => {
    const suggestionItem = e.target.closest('.suggestion-item');
    if (suggestionItem) {
      selectSuggestion(suggestionItem);
    }
  });
  
  // Select a suggestion
  function selectSuggestion(suggestionElement) {
    const value = suggestionElement.dataset.value;
    tutorSearchInput.value = value;
    currentSearchTerm = value;
    searchSuggestions.classList.remove('show');
    loadAvailableSlots();
  }
  
  // Update visual highlight
  function updateHighlight(suggestions) {
    suggestions.forEach((item, index) => {
      item.classList.toggle('highlighted', index === highlightedSuggestion);
    });
  }
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!tutorSearchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
      searchSuggestions.classList.remove('show');
    }
  });
  
  // Show all suggestions when focusing the input
  tutorSearchInput.addEventListener('focus', () => {
    if (currentSearchTerm) {
      showSuggestions(currentSearchTerm);
    }
  });
}

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
  bodyEl.classList.toggle('events-view', role === 'events');
  currentRole.textContent = role[0].toUpperCase() + role.slice(1);
  
  // Hide all sections first
  if (studentSection) studentSection.style.display = 'none';
  if (tutorSection) tutorSection.style.display = 'none';
  if (eventsSection) eventsSection.style.display = 'none';
  
  if (role === 'student' && auth.currentUser) {
    studentSection.style.display = 'block';
    await loadTutorSlots();
  } else if (role === 'events') {
    eventsSection.style.display = 'block';
    
    // Show coordinator panel if user is event coordinator
    if (auth.currentUser && isEventCoordinator(auth.currentUser.email)) {
      eventCoordinatorPanel.style.display = 'block';
      loadCoordinatorEvents();
    } else {
      eventCoordinatorPanel.style.display = 'none';
    }
    
    loadEvents(eventFilterCategory?.value || '', eventFilterTime?.value || 'upcoming');
  } else {
    tutorSection.style.display = 'block';
    await loadAvailableSlots();
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
    const specificSubj = document.getElementById('form-specific-subject').value;
    const langLevel = document.getElementById('form-language-level').value;

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
      tutorEmail: auth.currentUser.email || '',
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
    const formSpecificSubjectContainer = document.getElementById('form-specific-subject-container');
    const formLanguageLevelContainer = document.getElementById('form-language-level-container');
    const formBuildingSelectContainer = document.getElementById('building-select-container');
    
    if (formSpecificSubjectContainer) formSpecificSubjectContainer.style.display = 'none';
    if (formLanguageLevelContainer) formLanguageLevelContainer.style.display = 'none';
    if (formBuildingSelectContainer) formBuildingSelectContainer.style.display = 'none';
    await loadTutorSlots();
    
    // Refresh My Slots panel if it's open
    if (mySlotsPanel && mySlotsPanel.classList.contains('open')) {
      await loadMySlotsData();
    }

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
    // Add rate limiting protection
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const { min } = getMinMaxDates();
    availableSlots.innerHTML = '<div class="loading">Loading available slots...</div>';
    
    let slotsQuery = query(
      collection(db, 'slots'),
      where('date', '>=', min.toISOString().split('T')[0])
    );
    const slotsSnapshot = await getDocs(slotsQuery);
    
    // Filter by search term and selected date
    const searchTerm = tutorSearchInput?.value?.toLowerCase() || '';
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
      
      // Filter by search term and date
      const matchesSearch = !searchTerm || 
        slotData.subject?.toLowerCase().includes(searchTerm) ||
        slotData.subjectCategory?.toLowerCase().includes(searchTerm);
      
      const matchesDate = !date || slotData.date === date;
      
      if (matchesSearch && matchesDate) {
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
      
      // Filter by search term and date
      const matchesSearch = !searchTerm || 
        slotData.subject?.toLowerCase().includes(searchTerm) ||
        slotData.subjectCategory?.toLowerCase().includes(searchTerm);
      
      const matchesDate = !date || slotData.date === date;
      
      if (matchesSearch && matchesDate) {
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
    if (error.code === 'resource-exhausted') {
      availableSlots.innerHTML = '<div class="error">Too many requests. Please wait a moment and try again.</div>';
    } else {
      availableSlots.innerHTML = '<div class="error">Error loading slots. Please try again.</div>';
    }
  }
}
async function cleanupExpiredSlots() {
  const { min } = getMinMaxDates();
  const now = new Date();
  
  try {
    // Get all slots from both collections that might need cleanup
    const allSlotsQuery = query(collection(db, 'slots'));
    const allBookedSlotsQuery = query(collection(db, 'bookedSlots'));
    
    const [allSlots, allBookedSlots] = await Promise.all([
      getDocs(allSlotsQuery),
      getDocs(allBookedSlotsQuery)
    ]);
    
    const slotsToDelete = [];
    
    // Check regular slots
    allSlots.forEach((doc) => {
      const slotData = doc.data();
      const slotDate = slotData.date;
      const slotStartTime = slotData.startTime;
      
      // Create a Date object for the slot's start time
      const slotDateTime = new Date(`${slotDate}T${slotStartTime}`);
      
      // Delete if:
      // 1. Slot date is before minimum allowed date (2 days from now), OR
      // 2. Slot date/time has already passed
      const shouldDelete = slotDate < min.toISOString().split('T')[0] || slotDateTime <= now;
      
      if (shouldDelete) {
        slotsToDelete.push(doc.ref);
      }
    });
    
    // Check booked slots
    allBookedSlots.forEach((doc) => {
      const slotData = doc.data();
      const slotDate = slotData.date;
      const slotStartTime = slotData.startTime;
      
      // Create a Date object for the slot's start time
      const slotDateTime = new Date(`${slotDate}T${slotStartTime}`);
      
      // Delete if:
      // 1. Slot date is before minimum allowed date (2 days from now), OR
      // 2. Slot date/time has already passed
      const shouldDelete = slotDate < min.toISOString().split('T')[0] || slotDateTime <= now;
      
      if (shouldDelete) {
        slotsToDelete.push(doc.ref);
      }
    });
    
    // Delete all expired/past slots from both collections
    await Promise.all(slotsToDelete.map(docRef => deleteDoc(docRef)));
    
    if (slotsToDelete.length > 0) {
      console.log(`Cleaned up ${slotsToDelete.length} expired/past slots from both collections`);
    }
    
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
  // Initialize Google Sheets headers if configured
  initializeGoogleSheetsHeaders();
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
  
  // ADD THIS CHECK: Prevent booking your own slots
  if (auth.currentUser && slot.tutorId === auth.currentUser.uid) {
    alert("You can't book your own tutoring slot!");
    return;
  }
  
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

  // Show booking confirmation UI
  form.innerHTML = `
    <div style="text-align:center;padding:1em 0 0.5em 0;">
      <span style="font-size:1.2em; color:var(--primary); font-weight:600;">Book this slot?</span><br>
      <span style="color:#444; font-size:1em;">You will be added as the student for this session.</span>
    </div>
    <button type="submit" style="margin:1.2em auto 0 auto; display:block; background:linear-gradient(90deg, var(--primary), #4fb3d9); color:white; font-size:1.1em; font-weight:600; border:none; border-radius:8px; padding:0.7em 2em; box-shadow:0 2px 8px rgba(30,144,255,0.15); cursor:pointer; transition:all 0.2s;">Confirm Booking</button>
  `;
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    // ADD THIS AT THE START:
    const submitButton = e.target.querySelector('button[type="submit"]');
    if (submitButton.disabled) {
      return; // Already submitting
    }
    
    // Disable button and show loading state
    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Booking...';
    
    try {
      if (!auth.currentUser) {
        alert('Please sign in to book slots');
        return;
      }
      // Prevent double booking
      if (slot.bookedBy || slot.studentUid) {
        alert('This slot is already booked.');
        modal.style.display = 'none';
        return;
      }
      
      // Get student name from user profile
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const studentName = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : auth.currentUser.displayName || 'Unknown Student';

      // Create booked slot record
      const bookedSlotData = {
        ...slot,
        studentUid: auth.currentUser.uid,
        studentName: studentName,
        studentEmail: auth.currentUser.email || '',
        tutorEmail: slot.tutorEmail || '',
        bookedAt: new Date().toISOString(),
        originalCreatedAt: slot.createdAt
      };

      await addDoc(collection(db, 'bookedSlots'), bookedSlotData);
      await deleteDoc(doc(db, 'slots', slotId));

      // Write booking to Google Sheets
      await writeBookingToGoogleSheets(bookedSlotData);
      
      infoDiv.innerHTML = `<div style='color:var(--primary);font-size:1.1em;font-weight:600;text-align:center;margin:1em 0;'>Slot booked successfully!</div>`;
      form.innerHTML = '';
      setTimeout(() => { 
        modal.style.display = 'none'; 
        loadAvailableSlots(); 
        if (mySlotsPanel && mySlotsPanel.classList.contains('open')) {
          loadMySlotsData();
        }
      }, 1200);
    } catch (err) {
      console.error('Booking error:', err);
      infoDiv.innerHTML = `<div style='color:#c00;font-size:1em;text-align:center;margin:1em 0;'>Error booking slot. Please try again.</div>`;
    } finally {
      // ADD THIS FINALLY BLOCK:
      // Re-enable button
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  };
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
    
    // Check if user is admin
    const userIsAdmin = isAdmin(user.email);
    
    if (userIsAdmin) {
      // Admin view: hide role selector, show only admin panel
      roleSelect.style.display = 'none';
      settingsBtn.style.display = 'none';
      if (mySlotsBtn) mySlotsBtn.style.display = 'none';
      if (myStatsBtn) myStatsBtn.style.display = 'none';
      
      // Hide tutor and student sections
      if (studentSection) studentSection.style.display = 'none';
      if (tutorSection) tutorSection.style.display = 'none';
      if (eventsSection) eventsSection.style.display = 'none';
      
      // Show admin section
      const adminSection = document.getElementById('admin-section');
      if (adminSection) {
        adminSection.style.display = 'block';
        updatePeriodDisplay();
        loadAdminDashboard();
      }
      
      currentRole.textContent = 'Administrator';
      signBtn.textContent = 'Sign Out';
      profilePic.src = user.photoURL || 'avatar-placeholder.png';
      
      return;
    }
    
    // Regular user flow
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
    
    // Show My Slots and My Stats buttons when signed in
    if (mySlotsBtn) {
      mySlotsBtn.style.display = 'flex';
    }
    if (myStatsBtn) {
      myStatsBtn.style.display = 'flex';
    }
    
    if (roleSelect.value === 'student') {
      studentSection.style.display = 'block';
      tutorSection.style.display = 'none';
      eventsSection.style.display = 'none';
      await loadTutorSlots();
    } else if (roleSelect.value === 'events') {
      studentSection.style.display = 'none';
      tutorSection.style.display = 'none';
      eventsSection.style.display = 'block';
      
      // Show coordinator panel if user is event coordinator
      if (isEventCoordinator(user.email)) {
        eventCoordinatorPanel.style.display = 'block';
        loadCoordinatorEvents();
      } else {
        eventCoordinatorPanel.style.display = 'none';
      }
      
      loadEvents(eventFilterCategory?.value || '', eventFilterTime?.value || 'upcoming');
    } else {
      studentSection.style.display = 'none';
      tutorSection.style.display = 'block';
      eventsSection.style.display = 'none';
      await loadAvailableSlots();
    }
  } else {
    // Show immediate sign-in prompt
    alert('Please sign in to access CCA Peer Tutoring Platform');
    signInWithPopup(auth, provider).catch(error => {
      console.error('Sign-in error:', error);
      // If sign-in fails or is cancelled, show basic interface
      signBtn.textContent = 'Sign In';
      profilePic.src = 'avatar-placeholder.png';
      settingsBtn.style.display = 'none';
      
      // Handle view when not signed in
      if (roleSelect.value === 'events') {
        studentSection.style.display = 'none';
        tutorSection.style.display = 'none';
        eventsSection.style.display = 'block';
        eventCoordinatorPanel.style.display = 'none';
        loadEvents(eventFilterCategory?.value || '', eventFilterTime?.value || 'upcoming');
      } else {
        studentSection.style.display = 'none';
        eventsSection.style.display = 'none';
        tutorSection.style.display = 'block';
      }
      
      // Set just the role text when not signed in
      currentRole.textContent = roleSelect.value[0].toUpperCase() + roleSelect.value.slice(1);
      
      // Hide My Slots and My Stats buttons when not signed in
      if (mySlotsBtn) {
        mySlotsBtn.style.display = 'none';
      }
      if (myStatsBtn) {
        myStatsBtn.style.display = 'none';
      }
    });
  }
});

profileSetupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const userGrade = document.getElementById('user-grade').value;
  const profilePhotoFile = document.getElementById('profile-photo').files[0];
  
  if (!firstName || !lastName || !userGrade || !profilePhotoFile) {
    alert('Please fill in all fields and upload a profile photo');
    return;
  }

  try {
    // Convert image to base64 and resize it
    const photoBase64 = await convertImageToBase64(profilePhotoFile);
    
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      firstName: firstName,
      lastName: lastName,
      fullName: `${firstName} ${lastName}`,
      grade: parseInt(userGrade),
      profilePhotoBase64: photoBase64,
      helpNeededSubjects: [],
      tutoringSubjects: [],
      neverStudent: false,
      neverTutor: false,
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
