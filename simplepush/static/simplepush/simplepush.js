var isPushEnabled = false,
  subBtn,
  messageBox,
  registration;

var messages = {
  'subscribe': 'Subscribe to Push Messaging',
  'unsubscribe': 'Unsubscribe to Push Messaging',
  'loading': 'Loading...',
  'denied': 'The Push Notification is blocked in your browser.',
  'no_push': 'Push Notification is not available in the browser',
  'no_subscription': 'Subscription is not available',
  'sw_not_supported': 'Service Worker is not supported in your Browser!',
  'notifications_not_supported': 'Showing Notifications is not supported in your browser',
  'subscribe_ok': 'Successfully subscribed for Push Notification',
  'unsubscribe_ok': 'Successfully unsubscribed for Push Notification',
  'unsubscribe_error': 'Error during unsubscribe from Push Notification'
};

var new_messages = window.simplepush_messages || {};

for(k in new_messages){
  messages[k] = new_messages[k];
}

window.addEventListener('load', function() {
  subBtn = document.getElementById('simplepush-subscribe-button');
  messageBox = document.getElementById('simplepush-message');

  subBtn.addEventListener('click',
    function() {
      subBtn.disabled = true;
      if (isPushEnabled) {
        return unsubscribe()
      }

      // Do everything if the Browser Supports Service Worker
      if ('serviceWorker' in navigator) { 
        var serviceWorker = document.getElementById('service-worker-js').src;
        navigator.serviceWorker.register(serviceWorker)
          .then(
            function(reg) {
              subBtn.textContent = messages['loading'];
              registration = reg;
              if(initialiseState(reg)){
                subscribe(reg);
              };
            }
          );
      }
      // If service worker not supported, show warning to the message box
      else {  
        messageBox.textContent = messages['sw_not_supported'];
        messageBox.style.display = 'block'; 
      }
    }
  );

  navigator.serviceWorker.ready.then(function(reg){
    if(initialiseState(reg)){
      reg.pushManager.getSubscription().then(function(subscription){
        if(subscription){
          subBtn.textContent = messages['unsubscribe'];
          subBtn.disabled = false;
          isPushEnabled = true;
          registration = reg;
        }
      });
    };
  });

  // Once the service worker is registered set the initial state  
  function initialiseState(reg) {
    // Are Notifications supported in the service worker?  
    if (!(reg.showNotification)) {
        // Show a message and activate the button
        messageBox.textContent = messages['notifications_not_supported'];
        //subBtn.textContent = 'Subscribe to Push Messaging';
        messageBox.style.display = 'block';
        return false;
    }

    // Check the current Notification permission.  
    // If its denied, it's a permanent block until the  
    // user changes the permission  
    if (Notification.permission === 'denied') {
      // Show a message and activate the button
      messageBox.textContent = messages['denied'];
      subBtn.textContent = messages['subscribe'];
      subBtn.disabled = false;
      messageBox.style.display = 'block';
      return false;
    }

    // Check if push messaging is supported  
    if (!('PushManager' in window)) {
      // Show a message and activate the button 
      messageBox.textContent = messages['no_push'];
      subBtn.textContent = messages['subscribe'];
      subBtn.disabled = false;
      messageBox.style.display = 'block';
      return false;
    }

    // We may subscribe for push notification and send the information to server
    return true;
  }
}
);


function subscribe(reg) {
  // Get the Subscription or register one
  getSubscription(reg)
    .then(
      function(subscription) {
        postSubscribeObj('subscribe',subscription);
      }
    )
    .catch(
      function(error) {
        console.log('Subscription error.', error)
      }
    )
}

function getSubscription(reg) {
    return reg.pushManager.getSubscription()
      .then(
        function(subscription) {
          // Check if Subscription is available
          if (subscription) {
            return subscription;
          }
          // If not, register one
          return registration.pushManager.subscribe({ userVisibleOnly: true });
        }
      )
}

function unsubscribe() {
  // Get the Subscription to unregister
  registration.pushManager.getSubscription()
    .then(
      function(subscription) {

        // Check we have a subscription to unsubscribe
        if (!subscription) {
          // No subscription object, so set the state
          // to allow the user to subscribe to push
          subBtn.disabled = false;
          messageBox.textContent = messages['no_subscription'];
          messageBox.style.display = 'block';
          return;
        }
        postSubscribeObj('unsubscribe', subscription);
      }
    )  
}

function postSubscribeObj(statusType, subscription) {
  // Send the information to the server with fetch API.
  // the type of the request, the name of the user subscribing, 
  // and the push subscription endpoint + key the server needs
  // to send push messages
  var browser = navigator.userAgent.match(/(firefox|msie|chrome|safari|trident)/ig)[0].toLowerCase(),
    data = {  status_type: statusType,
              subscription: subscription.toJSON(),
              browser: browser,
              group: subBtn.dataset.group
           };

  fetch(subBtn.dataset.url, {
    method: 'post',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
    credentials: 'include'
  })
    .then(
      function(response) {
        // Check the information is saved successfully into server
        if ((response.status == 201) && (statusType == 'subscribe')) {
          // Show unsubscribe button instead
          subBtn.textContent = messages['unsubscribe'];
          subBtn.disabled = false;
          isPushEnabled = true;
          messageBox.textContent = messages['subscribe_ok'];
          messageBox.style.display = 'block';
        }

        // Check if the information is deleted from server
        if ((response.status == 202) && (statusType == 'unsubscribe')) {
          // Get the Subscription
          getSubscription(registration)
            .then(
              function(subscription) {
                // Remove the subscription
                subscription.unsubscribe()
                .then(
                  function(successful) {
                    subBtn.textContent = messages['subscribe'];
                    messageBox.textContent = messages['unsubscribe_ok'];
                    messageBox.style.display = 'block';
                    isPushEnabled = false;
                    subBtn.disabled = false;
                  }
                )
              }
            )
            .catch(
              function(error) {
                subBtn.textContent = messages['unsubscribe'];
                messageBox.textContent = messages['unsubscribe_error'];
                messageBox.style.display = 'block';
                subBtn.disabled = false;
              }
            );
        }
      }
    )
}
