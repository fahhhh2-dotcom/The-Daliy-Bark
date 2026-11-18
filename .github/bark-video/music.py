"""Makes an original, copyright-free background tune for Daily Bark videos.
Usage: python3 music.py SECONDS OUT.wav"""
import sys, wave
import numpy as np
sr = 44100; dur = float(sys.argv[1]); bpm = 96; beat = 60 / bpm
N=int(sr*dur); out=np.zeros(N)
rng=np.random.default_rng(7)
_c={}
def ks(freq, length, decay=0.996):
    k=(round(freq,2),length)
    if k in _c: return _c[k]
    n=int(sr*length); p=int(sr/freq); buf=rng.uniform(-1,1,p); y=np.zeros(n)
    for i in range(n):
        y[i]=buf[i%p]; buf[i%p]=decay*0.5*(buf[i%p]+buf[(i+1)%p])
    _c[k]=y
    return y
def note(m): return 440*2**((m-69)/12)
def add(sig,t,g):
    i=int(t*sr)
    if i>=N: return
    e=min(N,i+len(sig)); out[i:e]+=g*sig[:e-i]
chords=[[60,64,67],[55,59,62],[57,60,64],[53,57,60],[53,57,60],[60,64,67],[50,53,57],[55,59,62]]  # C G Am F | F C Dm G
bars=int(dur/(4*beat))+1
for b in range(bars):
    ch=chords[b%8]; t0=b*4*beat
    # pad
    n=int(4*beat*sr); tt=np.arange(n)/sr
    env=np.minimum(1,tt/0.4)*np.minimum(1,(4*beat-tt)/0.4)
    pad=sum(np.sin(2*np.pi*note(m-12)*tt)*0.5+np.sin(2*np.pi*note(m)*tt*1.003)*0.3 for m in ch)*env
    add(pad,t0,0.05)
    # bass
    bt=np.arange(int(beat*2*sr))/sr; bass=np.sin(2*np.pi*note(ch[0]-24)*bt)*np.exp(-bt*2.5)
    add(bass,t0,0.35); add(bass,t0+2*beat,0.3)
    # plucked arpeggio (ukulele-ish)
    pat=[0,1,2,1,0+12,2,1,2]
    for k,ix in enumerate(pat):
        m=ch[ix%3]+(12 if ix>=12 else 0)+12
        add(ks(note(m),1.2),t0+k*beat/2,0.22)
    # soft shaker
    for k in range(8):
        n2=int(0.06*sr); sh=rng.normal(0,1,n2)*np.exp(-np.arange(n2)/sr*60)
        sh=np.diff(np.concatenate([[0],sh]))
        add(sh,t0+k*beat/2+beat/4,0.04)
tt=np.arange(N)/sr
out*=np.minimum(1,tt/1.0)*np.minimum(1,(dur-tt)/2.5)
out/=np.max(np.abs(out))*1.12
st=np.stack([out,out],1)
with wave.open(sys.argv[2],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype('<i2').tobytes())
