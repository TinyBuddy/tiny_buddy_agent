import { and, eq, gte, lte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../db/db";
import { vocabulary } from "../db/schema";

// 定义查询参数验证模式
export const querySchema = z.object({
	childId: z.string(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
});

/**
 * 获取指定儿童ID在指定时间区间内的词汇表列表（去重）
 * @param request Next.js请求对象
 * @returns 词汇表列表的JSON响应
 */
export async function GET(request: NextRequest) {
	try {
		// 解析查询参数
		const { searchParams } = request.nextUrl;
		const queryParams = {
			childId: searchParams.get("childId"),
			startDate: searchParams.get("startDate"),
			endDate: searchParams.get("endDate"),
		};

		// 验证查询参数
		const { childId, startDate, endDate } = querySchema.parse(queryParams);

		console.log(
			`获取儿童 ${childId} 的词汇表，时间区间: ${startDate || "开始"} 到 ${endDate || "现在"}`,
		);

		// 构建查询条件
		const conditions = [eq(vocabulary.childId, childId)];

		// 添加时间区间条件
		if (startDate) {
			conditions.push(gte(vocabulary.createdAt, new Date(startDate)));
		}

		if (endDate) {
			conditions.push(lte(vocabulary.createdAt, new Date(endDate)));
		}

		// 查询数据库获取词汇表
		const result = await db
			.select({ word: vocabulary.word })
			.from(vocabulary)
			.where(and(...conditions));

		// 提取词汇并去重（虽然数据库结构已经保证childId和word的唯一性，但仍添加去重逻辑确保结果）
		const words = Array.from(new Set(result.map((item) => item.word)));

		// 返回成功响应
		return NextResponse.json({
			success: true,
			data: {
				words,
				count: words.length,
				childId,
				timeRange: {
					start: startDate || null,
					end: endDate || null,
				},
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("获取词汇表时出错:", error);

		// 处理验证错误
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: "参数验证失败",
					details: error.errors,
				},
				{
					status: 400,
				},
			);
		}

		// 处理其他错误
		return NextResponse.json(
			{
				success: false,
				error: "服务器内部错误",
				message: error instanceof Error ? error.message : "未知错误",
			},
			{
				status: 500,
			},
		);
	}
}
