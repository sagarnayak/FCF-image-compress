const functions = require('firebase-functions')
const googleCloudStorage = require('@google-cloud/storage')
const gcs = new googleCloudStorage.Storage()
const os = require('os')
const path = require('path')
const sharp = require('sharp')

exports.compressImage = functions.storage.object()
    .onFinalize(
        async (object) => {
            console.log(object)
            const bucket = object.bucket
            const filePath = object.name
            const destBucket = gcs.bucket(bucket)
            const tempfilePath = path.join(os.tmpdir(), 'toedit' + path.basename(filePath))
            const editedfilePath = path.join(os.tmpdir(), path.basename(filePath))
            const metadata = {
                contentType: object.contentType,
                metadata: {
                    edited: 'yes'
                }
            }

            try {
                if (
                    object.metadata.edited === 'yes'
                ) {
                    console.log('already done, going to skip')
                    return
                }
            } catch (err) {
                console.log('could not find the edited property. going to edit the image')
            }

            console.log('downloading the file')
            destBucket.file(filePath).download(
                {
                    destination: tempfilePath
                }
            )
                .then(
                    () => {
                        console.log('going to compress the file')
                        return sharp(tempfilePath)
                            .resize(500)
                            .toFile(editedfilePath)
                    }
                )
                .then(
                    () => {
                        console.log('deleting the file')
                        const file = destBucket.file(filePath)
                        return file.delete()
                    }
                )
                .then(
                    () => {
                        console.log('going to upload the compressed file')
                        return destBucket.upload(
                            editedfilePath,
                            {
                                destination: filePath,
                                metadata: metadata
                            }
                        )
                    }
                )
                .then(
                    () => {
                        return console.log('---- done ----')
                    }
                )
                .catch(
                    (err) => {
                        console.log('error --- > ' + err)
                        return
                    }
                )
        }
    )