const functions = require('firebase-functions')
const googleCloudStorage = require('@google-cloud/storage')
const gcs = new googleCloudStorage.Storage()
const os = require('os')
const path = require('path')
const sharp = require('sharp')

const admin = require('firebase-admin')
admin.initializeApp()
const storage = admin.storage()
storage.bucket()

exports.compressImage = functions.storage.object()
    .onFinalize(
        async (object) => {
            console.log(object)
            const bucket = object.bucket
            const filePath = object.name
            const destBucket = storage.bucket(bucket)
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
                    console.log('already done, going to skip ' + filePath)
                    return
                }
            } catch (err) {
                console.log('could not find the edited property. going to edit the image' + filePath)
            }

            console.log('downloading the file to ' + tempfilePath)
            destBucket.file(filePath).download(
                {
                    destination: tempfilePath
                }
            )
                .then(
                    () => {
                        console.log('going to compress the file' + filePath)
                        return sharp(tempfilePath)
                            .resize(500)
                            .toFile(editedfilePath)
                    }
                )
                .then(
                    () => {
                        console.log('---- compressed the file ----')
                        console.log(editedfilePath)
                        console.log('deleting the file' + tempfilePath)
                        const file = destBucket.file(filePath)
                        return file.delete()
                    }
                )
                .then(
                    () => {
                        console.log('going to upload the compressed file' + editedfilePath)
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
                    (result) => {
                        console.log('---- result ---- ' + result)
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