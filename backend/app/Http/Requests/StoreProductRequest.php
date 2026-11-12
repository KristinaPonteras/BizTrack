<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => [
                'required',
                'integer',
                'exists:categories,id',
            ],
            'product_name' => [
                'required',
                'string',
                'max:255',
            ],
            'sku' => [
                'required',
                'string',
                'max:100',
                'unique:products,sku',
            ],
            'cost_price' => [
                'required',
                'numeric',
                'min:0',
            ],
            'selling_price' => [
                'required',
                'numeric',
                'min:0',
            ],
            'stock_quantity' => [
                'required',
                'integer',
                'min:0',
            ],
            'reorder_level' => [
                'required',
                'integer',
                'min:0',
            ],
            'status' => [
                'required',
                'in:active,inactive',
            ],
        ];
    }
}