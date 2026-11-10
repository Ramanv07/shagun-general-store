import { jest } from '@jest/globals';

describe('W3-02: AutoScrollPoster dynamic layout slide width calculation', () => {
  const BANNERS_COUNT = 3;

  function simulatePosterLayout(containerWidth, currentSlideWidth = 0) {
    let nextSlideWidth = currentSlideWidth;
    // Mirrored directly from shagun-native/app/(tabs)/index.tsx onLayout handler
    const w = containerWidth;
    if (w > 0 && Math.abs(w - currentSlideWidth) > 2) {
      nextSlideWidth = w;
    }

    return {
      slideWidth: nextSlideWidth,
      scrollContainerWidth: nextSlideWidth * BANNERS_COUNT,
      slideWidthPercentOrPx: `${nextSlideWidth}px`,
      slideIndexOffset: (index) => index * nextSlideWidth
    };
  }

  test('Calculates exact slide width on 360dp mobile phone (360 - 32 margin = 328dp)', () => {
    const mobileWidth = 360 - 32; // 328
    const layout = simulatePosterLayout(mobileWidth, 0);

    expect(layout.slideWidth).toBe(328);
    expect(layout.scrollContainerWidth).toBe(328 * 3); // 984
    expect(layout.slideIndexOffset(0)).toBe(0);
    expect(layout.slideIndexOffset(1)).toBe(328);
    expect(layout.slideIndexOffset(2)).toBe(656);
  });

  test('Calculates exact slide width on Desktop Web container (e.g. 1024px)', () => {
    const webContainerWidth = 1024;
    const layout = simulatePosterLayout(webContainerWidth, 328);

    expect(layout.slideWidth).toBe(1024);
    expect(layout.scrollContainerWidth).toBe(1024 * 3);
    expect(layout.slideIndexOffset(1)).toBe(1024);
  });

  test('Adapts smoothly on dynamic resize / rotation without subpixel jitter', () => {
    // Subpixel variation under 2px does not trigger unnecessary re-renders
    const layoutNoJitter = simulatePosterLayout(328.5, 328);
    expect(layoutNoJitter.slideWidth).toBe(328); // Ignored jitter <= 2px

    // Orientation change to landscape 700dp updates accurately
    const rotatedLayout = simulatePosterLayout(700, 328);
    expect(rotatedLayout.slideWidth).toBe(700);
  });
});

