import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { VideoPlayerComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
  let component: VideoPlayerComponent;
  let fixture: ComponentFixture<VideoPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoPlayerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VideoPlayerComponent);
    component = fixture.componentInstance;
    component.playbackUrl = 'https://cdn.talentus.app/videos/test.mp4';
    fixture.detectChanges();
  });

  it('debe inicializar en proporción 16/9 con object-fit: contain para no recortar el video', () => {
    expect(component.isPortrait).toBeFalse();
    expect(component.videoAspectRatio).toBe('16 / 9');

    const videoEl: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    expect(getComputedStyle(videoEl).objectFit).toBe('contain');
  });

  it('debe adaptar el contenedor a formato vertical (portrait) cuando loadedmetadata reporta alto > ancho', () => {
    const videoEl: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    Object.defineProperty(videoEl, 'videoWidth', { configurable: true, get: () => 368 });
    Object.defineProperty(videoEl, 'videoHeight', { configurable: true, get: () => 656 });

    videoEl.dispatchEvent(new Event('loadedmetadata'));
    fixture.detectChanges();

    expect(component.isPortrait).toBeTrue();
    expect(component.videoAspectRatio).toBe('368 / 656');
    expect(component.videoRatio).toBeCloseTo(368 / 656, 4);

    const container: HTMLElement = fixture.nativeElement.querySelector('.player-container');
    expect(container.classList.contains('is-portrait')).toBeTrue();
  });

  it('debe mantener formato horizontal cuando loadedmetadata reporta ancho >= alto', () => {
    const videoEl: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    Object.defineProperty(videoEl, 'videoWidth', { configurable: true, get: () => 1920 });
    Object.defineProperty(videoEl, 'videoHeight', { configurable: true, get: () => 1080 });

    videoEl.dispatchEvent(new Event('loadedmetadata'));
    fixture.detectChanges();

    expect(component.isPortrait).toBeFalse();
    expect(component.videoAspectRatio).toBe('1920 / 1080');

    const container: HTMLElement = fixture.nativeElement.querySelector('.player-container');
    expect(container.classList.contains('is-portrait')).toBeFalse();
  });

  it('debe restablecer el aspect-ratio por defecto al cambiar playbackUrl en la playlist', () => {
    const videoEl: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    Object.defineProperty(videoEl, 'videoWidth', { configurable: true, get: () => 368 });
    Object.defineProperty(videoEl, 'videoHeight', { configurable: true, get: () => 656 });
    videoEl.dispatchEvent(new Event('loadedmetadata'));
    expect(component.isPortrait).toBeTrue();

    const previousUrl = component.playbackUrl;
    component.playbackUrl = 'https://cdn.talentus.app/videos/otro.mp4';
    component.ngOnChanges({
      playbackUrl: new SimpleChange(previousUrl, component.playbackUrl, false)
    });

    expect(component.isPortrait).toBeFalse();
    expect(component.videoAspectRatio).toBe('16 / 9');
  });
});
