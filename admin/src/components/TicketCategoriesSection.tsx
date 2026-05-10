import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

const API_URL = "http://localhost:8000/api/v1";

type Category = {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  price: number;
  total_quantity: number;
  remaining_quantity: number;
  max_per_booking: number;
};

type FormValues = {
  name: string;
  description?: string | null;
  price: number;
  total_quantity: number;
  max_per_booking: number;
};

type Props = {
  eventId: number;
};

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export const TicketCategoriesSection = ({ eventId }: Props) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/events/${eventId}`);
      if (!res.ok) throw new Error("Không tải được sự kiện");
      const data = await res.json();
      setCategories(data.ticket_categories || []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lỗi tải loại vé");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ max_per_booking: 5 });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.setFieldsValue({
      name: cat.name,
      description: cat.description ?? "",
      price: cat.price,
      total_quantity: cat.total_quantity,
      max_per_booking: cat.max_per_booking,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      const url = editing
        ? `${API_URL}/ticket-categories/${editing.id}`
        : `${API_URL}/events/${eventId}/ticket-categories`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Lưu thất bại");
      }
      message.success(editing ? "Đã cập nhật loại vé" : "Đã thêm loại vé");
      setModalOpen(false);
      fetchCategories();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lỗi lưu loại vé");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/ticket-categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Xoá thất bại");
      }
      message.success("Đã xoá loại vé");
      fetchCategories();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lỗi xoá");
    }
  };

  return (
    <Card
      title={
        <Space>
          <Typography.Text strong>Loại vé / Chỗ ngồi</Typography.Text>
          <Tag color="blue">{categories.length}</Tag>
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm loại vé
        </Button>
      }
      style={{ marginTop: 24 }}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={categories}
        pagination={false}
        locale={{ emptyText: "Chưa có loại vé. Bấm 'Thêm loại vé' để tạo." }}
      >
        <Table.Column dataIndex="name" title="Tên" />
        <Table.Column
          dataIndex="price"
          title="Giá"
          render={(v: number) => formatVND(v)}
        />
        <Table.Column dataIndex="total_quantity" title="Tổng" />
        <Table.Column
          title="Đã bán"
          render={(_, r: Category) => r.total_quantity - r.remaining_quantity}
        />
        <Table.Column
          dataIndex="remaining_quantity"
          title="Còn lại"
          render={(v: number) => (
            <Tag color={v === 0 ? "red" : "green"}>{v}</Tag>
          )}
        />
        <Table.Column dataIndex="max_per_booking" title="Max/đơn" />
        <Table.Column
          title="Hành động"
          render={(_, record: Category) => (
            <Space>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              />
              <Popconfirm
                title="Xoá loại vé này?"
                description="Không thể xoá nếu đã có vé bán ra."
                okText="Xoá"
                cancelText="Huỷ"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        />
      </Table>

      <Modal
        title={editing ? "Sửa loại vé" : "Thêm loại vé"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editing ? "Cập nhật" : "Tạo"}
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên loại vé"
            name="name"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Input placeholder="VIP / Standard / Khu A..." />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn (optional)" />
          </Form.Item>
          <Form.Item
            label="Giá (VND)"
            name="price"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={10000}
              formatter={(v) =>
                v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
              }
              parser={(v) => Number(v?.replace(/,/g, "") || 0) as 0}
            />
          </Form.Item>
          <Form.Item
            label="Tổng số vé"
            name="total_quantity"
            rules={[{ required: true, message: "Bắt buộc" }]}
            extra={
              editing
                ? `Đã bán: ${editing.total_quantity - editing.remaining_quantity}. Không thể giảm dưới số đã bán.`
                : undefined
            }
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
          <Form.Item
            label="Tối đa / đơn hàng"
            name="max_per_booking"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} max={100} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
