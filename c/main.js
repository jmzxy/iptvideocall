let APP_ID = "4169a863811c4d8ebac65d8277d1fd29"


let token = null;
let uid = String(Math.floor(Math.random() * 10000)) // unique user id

let client;
let channel; // channels that users joined

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

if (!roomId) {
    window.location = 'lobby.html'
}

let localStream; // set up local camera
let remoteStream;
let peerConnection; // initial peer connection

// set up stun servers to pass in peer connection
const servers = {
    iceServers: [{
        // free google stun servers
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }]
}


let constraints = {
    video: {
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 480, ideal: 1080, max: 1080 },
    },
    audio: true
}

let init = async() => {
    client = await AgoraRTM.createInstance(APP_ID) // create client
    await client.login({ uid, token }) //login client

    channel = client.createChannel(roomId) //create channel
    await channel.join() //join channel

    // everytime somebody join
    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    document.getElementById('user-1').srcObject = localStream
}


let handleUserLeft = (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer = async(message, MemberId) => {

        message = JSON.parse(message.text)

        if (message.type === 'offer') {
            createAnswer(MemberId, message.offer)
        }

        if (message.type === 'answer') {
            addAnswer(message.answer)
        }

        if (message.type === 'candidate') {
            if (peerConnection) {
                peerConnection.addIceCandidate(message.candidate)
            }
        }


    }
    // by default we will get member id

let handleUserJoined = async(MemberId) => {
    console.log('A new user joined the channel:', MemberId)
    createOffer(MemberId)
}

// connecting two peers together
// creating offer and sending it to the other peer along with the ice candidates
let createPeerConnection = async(MemberId) => {
        // stores all information between user and the remote peer
        // provides methods to connect to the other user
        peerConnection = new RTCPeerConnection(servers)

        // set up media stream inside remote stream
        remoteStream = new MediaStream()
        document.getElementById('user-2').srcObject = remoteStream
        document.getElementById('user-2').style.display = 'block'

        document.getElementById('user-1').classList.add('smallFrame')


        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            document.getElementById('user-1').srcObject = localStream
        }
        // get all local tracks and add them to peer connection
        localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, localStream)
            })
            // everytime remote peer add tracks this will added to peer connection
        peerConnection.ontrack = (event) => {
                // looping every single track from remote peer and set it to remoteStream
                event.streams[0].getTracks().forEach((track) => {
                    // any track will be added to video tag
                    remoteStream.addTrack(track)
                })
            }
            // onicecandidate - event listener eveytime create and ice candidate
        peerConnection.onicecandidate = async(event) => {
            // check if there is an ice candidate
            if (event.candidate) {
                client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId)
            }
        }
    }
    // set local description to offer
    // when we set the local description to offer,
    // it will trigger the ice candidate to start making request to stun servers
    // and it will create ice candidate   
let createOffer = async(MemberId) => {


    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId)
}


let createAnswer = async(MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, MemberId)
}


let addAnswer = async(answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}


let leaveChannel = async() => {
        await channel.leave()
        await client.logout()
    }
    //camera appear
let toggleCamera = async() => {
        let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

        if (videoTrack.enabled) {
            videoTrack.enabled = false
            document.getElementById('camera-btn').style.backgroundColor = 'rgb(18, 181, 170)'
        } else {
            videoTrack.enabled = true
            document.getElementById('camera-btn').style.backgroundColor = 'rgb(18, 181, 170)'
        }
    }
    //mic appear
let toggleMic = async() => {
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

    if (audioTrack.enabled) {
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(18, 181, 170)'
    } else {
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(18, 181, 170)'
    }
}

window.addEventListener('beforeunload', leaveChannel)
    //execution
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)

init()