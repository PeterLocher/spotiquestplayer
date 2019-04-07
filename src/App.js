import React, { Component } from 'react';
import './App.css';
import SpotifyWebApi from 'spotify-web-api-js';
import io from 'socket.io-client';

const socket = io('localhost:8000');

const spotifyApi = new SpotifyWebApi();

var playSomethingWithSlayer = true;

const slayerAlbums = [
    "2kwj7NbZ9YMGYYvCNrknoj",
    "44MTd2OAtSYY63DCcQ7P8n",
    "41dQQuob8FPy5zWGg4vLXU",
    "3MuaoZgcAFuanhg04e75LK",
    "743y70pTrfEfHZHtIyyQ6c",
    "2YKQekIfxPZK0O2XKw6wr6",
    "31pVN7QZwfWFo388SICgnd",
    "49QJ9TAWNqZGbFUvadXPgT",
    "2UqJjz5eMYRzbbKToD3Peh",
    "5v5BfkxWDAKTkzrXl3H0mU",
    "5g0QIKPHDAIVwiq03UeJpN",
    "3D6BriGykla1Qi2YzeoE7X"
];
const slayerAlbumSongCounts = [12, 11, 10, 13, 11, 14, 10, 10, 10, 12, 7, 10];
const songCount = slayerAlbumSongCounts.reduce((e1, e2) => e1 + e2);
const slayerAlbumArts = [
    "https://i.scdn.co/image/e21f82aad17cfa45999b693e900d7741ec268403",
    "https://i.scdn.co/image/eeffa6bba6831531232f95c3fea6aa59751d921f",
    "https://i.scdn.co/image/dcdb5c4270fe97408f37d75dc0f1bac52d29c02b",
    "https://i.scdn.co/image/3e3c9188aebfb71146fd2f94fcce0f2fe9404e51",
    "https://i.scdn.co/image/5e0f6aa7c1cc5ad1912216b54f1cce4b2034f850",
    "https://i.scdn.co/image/1e6c31b513ba3d99ecbaf10cec36c4648de665e7",
    "https://i.scdn.co/image/c6282f53a96c79573ad87107eb589ead54dc21e2",
    "https://i.scdn.co/image/5ccb1ccfced173ab51ef7d00d90d12b3ff01b9d8",
    "https://i.scdn.co/image/b9aa97e0154139172202caff53cdaf44b7541dc9",
    "https://i.scdn.co/image/18c6fef08f5729a6837551fae473d8f52b9eeb1e",
    "https://i.scdn.co/image/46012a6af63c7a95daac6614eee7daac439e66a0",
    "https://i.scdn.co/image/cb1ac525b97e59526b13e7035badcb70391165c8"
]

var flag = false;

class App extends Component {

    constructor(){
        super();
        const params = this.getHashParams();
        const token = params.access_token;
        if (token) {
            spotifyApi.setAccessToken(token);
        }
        this.state = {
            loggedIn: token,
            nowPlaying: { name: 'Not Checked', albumArt: '' },
            nextPlaying: { name: '', albumArt: '', artistName: ''},
            artistQ: "",
            trackQ: "",
            albumUri: "spotify:album:5v5BfkxWDAKTkzrXl3H0mU",
            trackNo: 9,
            currentTrackLength: 280000,
            nextTrackLength: 280000
        }
    }

    componentDidMount() {
        socket.on('connect', () => {
            console.log("Connected:", socket.connected);
            //console.log("heh", songs);
        });

        socket.on('nextSong', (data) => {
            if(data === '')
                this.letNextSongBeSlayer(Math.floor(Math.random() * songCount));
            else
                this.searchTrack(data);
        });
    }

    getNowPlaying(){
        spotifyApi.getMyCurrentPlaybackState()
            .then((response) => {
                if (response.item != null && response.item.name != null) {
                    this.setState({
                        nowPlaying: {
                            name: response.item.name,
                            albumArt: response.item.album.images[0].url
                        }
                    });
                }
            })
    }

    static playRainingBlood(){
        spotifyApi.play({
            device_id: "096f2cb4c5d91807c4b63d43402ff49df94b54c3",
            context_uri: "spotify:album:5v5BfkxWDAKTkzrXl3H0mU",
            offset: {
                position: 9
            },
            position_ms: 32000});
    }

    playNextTrack(){
        var albumUri = this.state.albumUri;
        var trackNo = this.state.trackNo;
        spotifyApi.play({
            device_id: "096f2cb4c5d91807c4b63d43402ff49df94b54c3",
            context_uri: albumUri,
            offset: {
                position: trackNo
            },
            position_ms: 0});
        this.interval = setInterval(() => this.checkPlayNextTrack(), 2000);
        this.setState({currentTrackLength: this.state.nextTrackLength});
        flag = false;
    }

    checkPlayNextTrack(){
        spotifyApi.getMyCurrentPlaybackState()
            .then((response) => {
                var timeLeft = this.state.currentTrackLength - response.progress_ms;
                socket.emit('songIsAt', response.progress_ms);
                if(!flag && timeLeft < 30000) {
                    socket.emit('getNextSong');
                    //clearInterval(this.interval);
                    setTimeout(() => this.sendNextSongToServer(), timeLeft - 4000);
                    setTimeout(() => this.playNextTrack(), timeLeft - 500);
                    flag = true;
                }
            });
    }

    sendNextSongToServer() {
        socket.emit('songData', {
            name: this.state.nextPlaying.name,
            albumArt: this.state.nextPlaying.albumArt,
            songLength: this.state.nextTrackLength,
            artistName: this.state.nextPlaying.artistName
        })
    }

    searchTrack(q){
        this.secretCodes(q);
        // if (playSomethingWithSlayer) {
        //     this.letNextSongBeSlayer(q);
        //     return;
        // }
        spotifyApi.searchTracks(q, {
            limit: 1
        }).then((response) => {
            var item = response.tracks.items[0];
            if (item == null) {this.letNextSongBeSlayer(this.slayerify(q));}
            else if (playSomethingWithSlayer && item.artists[0].name !== "Slayer") {
                this.letNextSongBeSlayer(this.slayerify(item.name + item.artists[0].name));
            }
            else {
                this.setState({
                    albumUri: item.album.uri,
                    trackNo: item.track_number - 1,
                    nextTrackLength: item.duration_ms,
                    nextPlaying: {name: item.name,
                        albumArt: item.album.images[0].url,
                        artistName: item.artists[0].name}
                })
            }
        })
    }

    secretCodes(q) {
        if (q === " killslayer123") {
            playSomethingWithSlayer = false;
        }
        if (q === " reviveslayer123") {
            playSomethingWithSlayer = true;
        }
    }

    hashCode = function(s){
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    };

    slayerify(q) {
        const hash = this.hashCode(q);
        const noOfSong = Math.abs(hash) % songCount;
        return noOfSong;
    }

    letNextSongBeSlayer(songNo) {
        const slayer = this.selectSlayerAlbum(songNo);
        spotifyApi.getAlbumTracks(slayer.album).then((response) => {
            var item = response.items[slayer.number];
            this.setState({
                albumUri: "spotify:album:"+slayer.album,
                trackNo: slayer.number,
                nextTrackLength: item.duration_ms,
                nextPlaying: {name: item.name,
                    albumArt: slayer.art,
                    artistName: 'Slayer' }
            })
        });
    }

    selectSlayerAlbum(number) {
        var noSoFar = 0;
        for (let i = 0; i < slayerAlbumSongCounts.length; i++) {
            noSoFar += slayerAlbumSongCounts[i];
            if (number < noSoFar) {
                return {album: slayerAlbums[i], number: slayerAlbumSongCounts[i] - (noSoFar - number), art: slayerAlbumArts[i]}
            }
        }
    }

    getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        e = r.exec(q);
        while (e) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
            e = r.exec(q);
        }
        return hashParams;
    }

    render() {
        this.getNowPlaying();

        return (
            <div className='App'>
                <a href='http://localhost:8888'>
                    Login to Spotify
                </a>

                <div>
                    Now Playing: {this.state.nowPlaying.name}
                </div>

                <div>
                    <img src={this.state.nowPlaying.albumArt} style={{ height: 150 }}/>
                </div>

                <div>
                    <text>
                        Sang_______
                    </text>
                    <input type="text"
                           onChange={(e) => {
                               if(e.target.value !== undefined) this.setState({trackQ: e.target.value})
                           }}
                           value={this.state.trackQ}>
                    </input>
                </div>

                <div>
                    <text>
                        Kunstner___
                    </text>
                    <input type="text"
                           onChange={(e) => {
                               if(e.target.value !== undefined) this.setState({artistQ: e.target.value})
                           }}
                           value={this.state.artistQ}>
                    </input>
                </div>

                <div>
                    {this.state.loggedIn &&
                    <button onClick={() => {
                        this.searchTrack(this.state.artistQ + " " + this.state.trackQ)
                    }}>
                        Get track
                    </button>}

                    { this.state.loggedIn &&
                    <button onClick={() => this.playNextTrack()}>
                        Play next track
                    </button>}
                </div>
            </div>
        )
    }
}

export default App;