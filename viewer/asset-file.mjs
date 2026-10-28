import {staticFile} from 'remotion';

// The standalone artwork can be hosted under a GitHub Pages repository path.
export function assetFile(file){
 const base=typeof window!=='undefined'&&window.__ebbAssetBase;
 return base?new URL(file,new URL(base,window.location.origin)).href:staticFile(file);
}
