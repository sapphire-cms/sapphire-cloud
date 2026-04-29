import {
  ContentMap,
  Document,
  DocumentInfo,
  HydratedContentSchema,
  Option,
  PersistenceError,
  PersistenceLayer,
} from '@sapphire-cms/core';
import { Outcome, program, Program, success } from 'defectless';
import { firestore } from 'firebase-admin';
// eslint-disable-next-line import/no-unresolved
import { AppOptions, cert, initializeApp } from 'firebase-admin/app';
// eslint-disable-next-line import/no-unresolved
import { getFirestore } from 'firebase-admin/firestore';
import * as packageJson from '../package.json';
import { FirebaseModuleParams } from './firebase.module';
import Firestore = firestore.Firestore;
import DocumentReference = firestore.DocumentReference;
import CollectionReference = firestore.CollectionReference;
import DocumentData = firestore.DocumentData;
import QuerySnapshot = firestore.QuerySnapshot;

export default class FirestorePersistenceLayer implements PersistenceLayer<FirebaseModuleParams> {
  private readonly db: Firestore;

  constructor(params: FirebaseModuleParams) {
    let options: AppOptions | undefined = undefined;

    if (params.projectId) {
      options = {
        credential: cert({
          projectId: params.projectId,
          clientEmail: params.clientEmail,
          privateKey: params.privateKey,
        }),
      };
    }

    const app = initializeApp(options);
    this.db = getFirestore(app);
  }

  public prepareSingletonRepo(_schema: HydratedContentSchema): Outcome<void, PersistenceError> {
    // DO NOTHING
    return success();
  }

  public prepareCollectionRepo(_schema: HydratedContentSchema): Outcome<void, PersistenceError> {
    // DO NOTHING
    return success();
  }

  public prepareTreeRepo(_schema: HydratedContentSchema): Outcome<void, PersistenceError> {
    // DO NOTHING
    return success();
  }

  public getContentMap(): Outcome<Option<ContentMap>, PersistenceError> {
    const docRef = this.db.collection('contentMap').doc('contentMap');
    return this.fetchDocument(docRef);
  }

  public listSingleton(documentId: string): Outcome<DocumentInfo[], PersistenceError> {
    const singletonCollection = this.db
      .collection('singletons')
      .doc(documentId)
      .collection('variants');
    return this.listCollectionDocuments(singletonCollection).map((snapshot) => {
      const variants = snapshot.docs.map((doc) => doc.id);
      return [
        {
          store: documentId,
          path: [],
          variants,
        },
      ];
    });
  }

  public listAllFromCollection(collectionName: string): Outcome<DocumentInfo[], PersistenceError> {
    const documentsCollection = this.db.collection(collectionName);

    return program(function* (): Program<DocumentInfo[], PersistenceError> {
      const documents: QuerySnapshot<DocumentData, DocumentData> =
        yield this.listCollectionDocuments(documentsCollection);
      const docs: DocumentInfo[] = [];

      for (const document of documents.docs) {
        const variantsCollection = documentsCollection.doc(document.id).collection('variants');
        const snapshot: QuerySnapshot<DocumentData, DocumentData> =
          yield this.listCollectionDocuments(variantsCollection);
        const variants = snapshot.docs.map((doc) => doc.id);

        docs.push({
          store: collectionName,
          path: [],
          docId: document.id,
          variants,
        });
      }

      return docs;
    }, this);
  }

  public listAllFromTree(treeName: string): Outcome<DocumentInfo[], PersistenceError> {
    const treeCollection = this.db.collection(treeName);
    return this.walkTree(treeName, treeCollection);
  }

  public getSingleton(
    documentId: string,
    variant: string,
  ): Outcome<Option<Document>, PersistenceError> {
    const docRef = this.singletonRef(documentId, variant);
    return this.fetchDocument(docRef);
  }

  public getFromCollection(
    collectionName: string,
    documentId: string,
    variant: string,
  ): Outcome<Option<Document>, PersistenceError> {
    const docRef = this.collectionElemRef(collectionName, documentId, variant);
    return this.fetchDocument(docRef);
  }

  public getFromTree(
    treeName: string,
    path: string[],
    documentId: string,
    variant: string,
  ): Outcome<Option<Document>, PersistenceError> {
    const docRef = this.treeLeafRef(treeName, path, documentId, variant);
    return this.fetchDocument(docRef);
  }

  public startTransaction(): Outcome<string, PersistenceError> {
    return Outcome.success('none'); // DO NOTHING
  }

  public completeTransaction(_transactionId: string): Outcome<void, PersistenceError> {
    return Outcome.success(); // DO NOTHING
  }

  public abortTransaction(_transactionId: string): Outcome<void, PersistenceError> {
    return Outcome.success(); // DO NOTHING
  }

  public updateContentMap(
    contentMap: ContentMap,
    _transactionId?: string,
  ): Outcome<void, PersistenceError> {
    const docRef = this.db.collection('contentMap').doc('contentMap');
    return this.saveDocument(docRef, contentMap);
  }

  public putSingleton(
    documentId: string,
    variant: string,
    document: Document,
    _transactionId?: string,
  ): Outcome<Document, PersistenceError> {
    const singletonDocumentRef = this.db.collection('singletons').doc(documentId);
    const variantDocumentRef = singletonDocumentRef.collection('variants').doc(variant);
    document.createdBy = `firestore@${packageJson.version}`;

    return program(function* (): Program<Document, PersistenceError> {
      yield this.saveDocument(singletonDocumentRef, {
        id: document.id,
        store: document.store,
        path: document.path,
        type: document.type,
        createdBy: document.createdBy,
      });

      yield this.saveDocument(variantDocumentRef, document);
      return document;
    }, this);
  }

  public putToCollection(
    collectionName: string,
    documentId: string,
    variant: string,
    document: Document,
    _transactionId?: string,
  ): Outcome<Document, PersistenceError> {
    const collectionDocumentRef = this.db.collection(collectionName).doc(documentId);
    const variantDocumentRef = collectionDocumentRef.collection('variants').doc(variant);
    document.createdBy = `firestore@${packageJson.version}`;

    return program(function* (): Program<Document, PersistenceError> {
      yield this.saveDocument(collectionDocumentRef, {
        id: document.id,
        store: document.store,
        path: document.path,
        type: document.type,
        createdBy: document.createdBy,
      });

      yield this.saveDocument(variantDocumentRef, document);
      return document;
    }, this);
  }

  public putToTree(
    treeName: string,
    path: string[],
    documentId: string,
    variant: string,
    document: Document,
    _transactionId?: string,
  ): Outcome<Document, PersistenceError> {
    let nodeCollectionRef: CollectionReference = this.db.collection(treeName);

    return program(function* (): Program<Document, PersistenceError> {
      for (const node of path) {
        const nodeDocumentRef = nodeCollectionRef.doc(node);
        yield this.saveDocument(nodeDocumentRef, {
          nodeId: node,
        });

        nodeCollectionRef = nodeDocumentRef.collection('children');
      }

      const leafDocumentRef = nodeCollectionRef.doc(documentId);
      const variantDocumentRef = leafDocumentRef.collection('variants').doc(variant);
      document.createdBy = `firestore@${packageJson.version}`;

      yield this.saveDocument(leafDocumentRef, {
        id: document.id,
        store: document.store,
        path: document.path,
        type: document.type,
        createdBy: document.createdBy,
      });

      yield this.saveDocument(variantDocumentRef, document);
      return document;
    }, this);
  }

  public deleteSingleton(
    documentId: string,
    variant: string,
    _transactionId?: string,
  ): Outcome<Option<Document>, PersistenceError> {
    const variantDocRef = this.singletonRef(documentId, variant);
    const documentRef = this.db.collection('singletons').doc(documentId);

    return program(function* (): Program<Option<Document>, PersistenceError> {
      const doc = yield this.fetchDocument(variantDocRef);
      yield this.deleteDocument(variantDocRef);
      yield this.deleteDocument(documentRef);
      return doc;
    }, this);
  }

  public deleteFromCollection(
    collectionName: string,
    documentId: string,
    variant: string,
    _transactionId?: string,
  ): Outcome<Option<Document>, PersistenceError> {
    const variantDocRef = this.collectionElemRef(collectionName, documentId, variant);
    const documentRef = this.db.collection(collectionName).doc(documentId);

    return program(function* (): Program<Option<Document>, PersistenceError> {
      const doc = yield this.fetchDocument(variantDocRef);
      yield this.deleteDocument(variantDocRef);
      yield this.deleteDocument(documentRef);
      return doc;
    }, this);
  }

  public deleteFromTree(
    treeName: string,
    path: string[],
    documentId: string,
    variant: string,
    _transactionId?: string,
  ): Outcome<Option<Document>, PersistenceError> {
    const variantDocRef = this.treeLeafRef(treeName, path, documentId, variant);
    let nodeCollectionRef: CollectionReference = this.db.collection(treeName);

    return program(function* (): Program<Option<Document>, PersistenceError> {
      const doc = yield this.fetchDocument(variantDocRef);
      yield this.deleteDocument(variantDocRef);

      for (const node of path) {
        const nodeDocumentRef = nodeCollectionRef.doc(node);
        yield this.deleteDocument(nodeDocumentRef);
        nodeCollectionRef = nodeDocumentRef.collection('children');
      }

      const leafDocumentRef = nodeCollectionRef.doc(documentId);
      yield this.deleteDocument(leafDocumentRef);

      return doc;
    }, this);
  }

  private singletonRef(documentId: string, variant: string): DocumentReference {
    return this.db.collection('singletons').doc(documentId).collection('variants').doc(variant);
  }

  private collectionElemRef(
    collectionName: string,
    documentId: string,
    variant: string,
  ): DocumentReference {
    return this.db.collection(collectionName).doc(documentId).collection('variants').doc(variant);
  }

  private treeLeafRef(
    treeName: string,
    treePath: string[],
    documentId: string,
    variant: string,
  ): DocumentReference {
    let docRef: DocumentReference | CollectionReference = this.db.collection(treeName);

    for (const node of treePath) {
      docRef = docRef.doc(node).collection('children');
    }

    docRef = docRef.doc(documentId).collection('variants').doc(variant);
    return docRef;
  }

  private listCollectionDocuments(
    colRef: CollectionReference,
  ): Outcome<QuerySnapshot<DocumentData, DocumentData>, PersistenceError> {
    return Outcome.fromSupplier(
      () => colRef.get(),
      (err) => new PersistenceError('Failed to list documents in collection', err),
    );
  }

  private listDocumentCollections(
    docRef: DocumentReference,
  ): Outcome<CollectionReference[], PersistenceError> {
    return Outcome.fromSupplier(
      () => docRef.listCollections(),
      (err) => new PersistenceError('Failed to list subcollections of the documents', err),
    );
  }

  private fetchDocument<T>(docRef: DocumentReference): Outcome<Option<T>, PersistenceError> {
    return Outcome.fromSupplier(
      () => docRef.get(),
      (err) => new PersistenceError('Failed to fetch document from Firestore', err),
    ).map((snapshot) => {
      return snapshot.exists ? Option.some(snapshot.data() as T) : Option.none();
    });
  }

  private saveDocument<T extends Document | ContentMap | { [x: string]: unknown }>(
    docRef: DocumentReference,
    document: T,
  ): Outcome<void, PersistenceError> {
    return Outcome.fromSupplier(
      () => docRef.set(document),
      (err) => new PersistenceError('Failed to save document into Firestore', err),
    ).map(() => {});
  }

  private deleteDocument(docRef: DocumentReference): Outcome<void, PersistenceError> {
    return Outcome.fromSupplier(
      () => docRef.delete(),
      (err) => new PersistenceError('Failed to delete document from Firestore', err),
    ).map(() => {});
  }

  private walkTree(
    store: string,
    collection: CollectionReference,
  ): Outcome<DocumentInfo[], PersistenceError> {
    return program(function* (): Program<DocumentInfo[], PersistenceError> {
      const snapshot: QuerySnapshot<DocumentData, DocumentData> =
        yield this.listCollectionDocuments(collection);
      const docsIds: string[] = snapshot.docs.map((doc) => doc.id);

      const docsInfo: DocumentInfo[] = [];

      for (const docId of docsIds) {
        const childDocRef = collection.doc(docId);
        const childCollections: CollectionReference[] =
          yield this.listDocumentCollections(childDocRef);
        const colIds = childCollections.map((col) => col.id);

        const isNode = colIds.some((id) => id === 'children');
        const isLeaf = colIds.some((id) => id === 'variants');

        if (isLeaf) {
          const variantsCollection = childDocRef.collection('variants');
          const snapshot: QuerySnapshot<DocumentData, DocumentData> =
            yield this.listCollectionDocuments(variantsCollection);
          const variants = snapshot.docs.map((doc) => doc.id);

          docsInfo.push({
            store,
            path: [],
            docId,
            variants,
          });
        } else if (isNode) {
          const childrenCollection = childDocRef.collection('children');
          const children: DocumentInfo[] = yield this.walkTree(store, childrenCollection);

          for (const child of children) {
            child.path.unshift(docId);
          }

          docsInfo.push(...children);
        }
      }

      return docsInfo;
    }, this);
  }
}
