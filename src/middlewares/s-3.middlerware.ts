import { S3 } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"

export const s3 = new S3({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
})

export const listBuckets = async () => {
    await s3
        .listBuckets()
        .then((res) => console.log(res.Buckets))
        .catch((err) => console.log(err.Code))
}

export const createBuckets = async (bucketName: string) => {
    await s3
        .createBucket({Bucket: bucketName})
        .then((res) => console.log(res))
        .catch((err) => console.log(err.Code))
}

export const deleteBuckets = async (bucketName: string) => {
    await s3
        .deleteBucket({Bucket: bucketName})
        .then((res) => console.log(res))
        .catch((err) => console.log(err.Code))
}

export const uploadFile = async ({bucketName, key, content, file}:
    {bucketName: string,
    key: string,
    content: string,
    file: any}
) => {
    const upload = new Upload({
        client: s3,
        params: {
            Bucket: bucketName,
            Key: key,
            Body: file.data,
            ContentType: content,
            ACL: "public-read"
        }
    })

    try {
        const res = await upload.done();
        return res;
    } catch (err) {
        throw new Error(`Failed to upload file: ${err}`);
    }
}

export const deleteObject = async ({ bucketName, key }:
    {
        bucketName: string,
        key: string
    }
) => {
    try {
        const res = await s3.deleteObject({ Bucket: bucketName, Key: key });
        console.log(`Successfully deleted object: ${key} from bucket: ${bucketName}`);
        return res;
    } catch (err) {
        console.log(`Failed to delete object: ${err}`);
        throw new Error(`Failed to delete object: ${err}`);
    }
}

export const putObject = async ({ bucketName, key, newFile }: 
    { bucketName: string, key: string, newFile: any }
) => {
    const upload = new Upload({
        client: s3,
        params: {
            Bucket: bucketName,
            Key: key,
            Body: newFile.data,
            ACL: "public-read"
        }
    });

    try {
        const res = await upload.done();
        console.log(`Successfully updated object: ${key} in bucket: ${bucketName}`);
        if(!res.Location){
            throw new Error("no location");
        }
        return res.Location;
    } catch (err) {
        throw new Error(`Failed to update object: ${err}`);
    }
};