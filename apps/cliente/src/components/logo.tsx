import { Image } from 'expo-image';

const sources = {
  principal: require('@/assets/brand/sionmarket-logo-principal.png'),
  negativo: require('@/assets/brand/sionmarket-logo-negativo.png'),
  blanco: require('@/assets/brand/sionmarket-logo-mono-blanca.png'),
  isotipo: require('@/assets/brand/sionmarket-isotipo-naranja.png'),
  isotipoBlanco: require('@/assets/brand/sionmarket-isotipo-blanco.png'),
};

const ratios = { principal: 1200 / 526, negativo: 1200 / 526, blanco: 1200 / 526, isotipo: 420 / 710, isotipoBlanco: 420 / 710 };

export function Logo({ kind = 'principal', height = 40 }: { kind?: keyof typeof sources; height?: number }) {
  return (
    <Image source={sources[kind]} style={{ height, width: height * ratios[kind] }} contentFit="contain" />
  );
}
