export enum Genre {
  Jazz = 'jazz',
  Blues = 'blues',
  Classical = 'classical',
  Rock = 'rock',
  HipHop = 'hiphop',
  Electronic = 'electronic',
  Folk = 'folk',
  Discord = 'discord',
}

export const GENRES = Object.freeze([
  Genre.Jazz,
  Genre.Blues,
  Genre.Classical,
  Genre.Rock,
  Genre.HipHop,
  Genre.Electronic,
  Genre.Folk,
  Genre.Discord,
] as const);
