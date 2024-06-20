export interface CreateSongDto {
    name: string;
    singer: string;
    released_date: string;
    duration: string;
    song_location: string | undefined;
    key_song: string;
    poster_location: string | undefined;
    key_poster: string;
}