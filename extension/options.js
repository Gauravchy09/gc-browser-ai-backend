document.addEventListener('DOMContentLoaded', () => {
  const grantBtn = document.getElementById('grantBtn');
  const statusEl = document.getElementById('status');

  grantBtn.addEventListener('click', async () => {
    try {
      statusEl.textContent = 'Waiting for your permission...';
      statusEl.className = '';
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately since we just needed the permission flag set in Chrome
      stream.getTracks().forEach(track => track.stop());
      
      statusEl.textContent = 'Success! You can close this tab and use the mic in the sidebar.';
      statusEl.className = 'success';
      grantBtn.style.display = 'none';

    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Access denied or error: ' + err.message;
      statusEl.className = 'error';
    }
  });
});
