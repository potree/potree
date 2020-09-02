window.downloadTutorial = (samplename, urls) => {
  const basePathParts = urls[0].split('/')
  basePathParts.pop()
  Promise.all(
    urls.map(url =>
      fetch(url).then(resp => {
        if (resp.url.endsWith('.zcad')) return resp.arrayBuffer()
        else return resp.text()
      })
    )
  ).then(datas => {
    const zip = new JSZip()
    datas.forEach((data, index) => {
      const urlParts = urls[index].split('/')
      basePathParts.forEach((basePathPart, index) => {
        console.warn('Implement a way of restricting files that can be downloaded')
        /* if (urlParts[index] != basePathPart) {
          throw 'All tutorial files must be nested under the foler of the tutorial file'
        }*/
      })
      console.log(urlParts.slice(basePathParts.length).join('/'))
      zip.file(urlParts.slice(basePathParts.length).join('/'), data)
    })
    // img.file("smile.gif", imgData, {base64: true});
    zip.generateAsync({ type: 'blob' }).then(function(content) {
      // see FileSaver.js
      saveAs(content, samplename)
    })
  })
}