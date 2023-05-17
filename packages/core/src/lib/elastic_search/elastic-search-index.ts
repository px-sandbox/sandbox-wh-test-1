import { Github } from 'abstraction';
import client from './client';

export class ElasticClient {
	public static async saveOrUpdateDocument(
		indexName: Github.Enums.IndexName,
		document: any
	): Promise<void> {
		try {
			// CALL FOR CREATE INDICES
			// Use a forEach loop to iterate over the documents array
			// document.forEach(async (doc: any) => {
			const { id, ...body } = document;
			await client.index({
				index: indexName,
				id,
				body,
			});
			// });
		} catch (error) {
			console.error(error);
		}
	}
}
