import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { environment } from '../../environments/environment';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envía texto + history al endpoint /api/voice/chat', (done) => {
    const history = [{ user: 'hola', assistant: 'hey' }];

    service.sendMessage('probando', history).subscribe((res) => {
      expect(res.success).toBeTrue();
      expect(res.data.text).toBe('respuesta');
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/voice/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ text: 'probando', history });

    req.flush({ success: true, data: { text: 'respuesta' } });
  });

  it('envía FormData en sendAudio al mismo endpoint', () => {
    const fd = new FormData();
    fd.append('audio', new Blob(['abc']), 'test.wav');

    service.sendAudio(fd).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/voice/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ success: true, data: { text: 'ok' } });
  });

  it('usa /api/voice/synthesize-base64 para ttsBase64', (done) => {
    service.ttsBase64('hola').subscribe((res) => {
      expect(res.success).toBeTrue();
      expect(res.audio_base64).toBe('b64audio');
      done();
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/api/voice/synthesize-base64`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ text: 'hola' });

    req.flush({ success: true, audio_base64: 'b64audio' });
  });

  it('llama /api/voice/transcribe con FormData en transcribe', (done) => {
    const fd = new FormData();
    fd.append('audio', new Blob(['abc']), 'sample.wav');

    service.transcribe(fd).subscribe((res) => {
      expect(res.success).toBeTrue();
      expect(res.transcript).toBe('hola');
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/voice/transcribe`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ success: true, transcript: 'hola' });
  });
});
