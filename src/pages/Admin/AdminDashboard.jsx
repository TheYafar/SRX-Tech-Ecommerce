import { useState, useEffect, useCallback } from 'react';
import {
  PackagePlus, CheckCircle, XCircle, Image as ImageIcon,
  DollarSign, UploadCloud, Loader2, Layers, Pencil, Check, X,
  PlusCircle, Sparkles, Mail, Search
} from 'lucide-react';
import { supabase, uploadProductImage } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { useProducts } from '../../context/ProductContext';
import { enviarCorreoPagoVerificado } from '../../services/emailService';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import './AdminDashboard.css';

export default function AdminDashboard({ activeSection = 'addProduct' }) {
  const { showSuccess, showError } = useNotifications();
  const { addProductToState } = useProducts();
  const [activeTab, setActiveTab] = useState(activeSection);

  useEffect(() => {
    setActiveTab(activeSection);
  }, [activeSection]);

  // ── States for Add Product ──────────────────────────────
  const [productData, setProductData] = useState({
    category_id: '',
    name: '',
    description: '',
    price_usd: '',
    stock: '',
    specifications: ''
  });
  const [portada, setPortada] = useState(null);
  const [previewPortada, setPreviewPortada] = useState('');
  const [galeria, setGaleria] = useState([]);
  const [previewGaleria, setPreviewGaleria] = useState([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [categories, setCategories] = useState([]);

  // ── States for Payments ─────────────────────────────────
  const [pendingPayments, setPendingPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paymentsFilter, setPaymentsFilter] = useState('pending'); // 'pending' | 'history'
  const [paymentsSearchTerm, setPaymentsSearchTerm] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (activeTab === 'payments' && location.state?.searchOrderId) {
      setPaymentsSearchTerm(location.state.searchOrderId);
      if (location.state.paymentsFilter) {
        setPaymentsFilter(location.state.paymentsFilter);
      }
      // Limpiar el estado de navegación
      window.history.replaceState({}, document.title);
    }
  }, [activeTab, location.state]);

  // ── States for Category Management ─────────────────────
  const [allCategories, setAllCategories] = useState([]);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Dynamic Classification States
  const [classificationOptions, setClassificationOptions] = useState([]);
  const [selectedClassificationId, setSelectedClassificationId] = useState(null);
  const [isCreatingClassification, setIsCreatingClassification] = useState(false);
  const [newClassificationName, setNewClassificationName] = useState('');
  const [isSavingClassification, setIsSavingClassification] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);



  // ── States for Banners ─────────────────────────────────
  const [bannerData, setBannerData] = useState({
    title: '',
    subtitle: '',
    link_url: '/tienda',
    redirect_url: '',
    product_id: '',
    order_index: 0
  });
  const [bannerImagePc, setBannerImagePc] = useState(null);
  const [bannerImageMobile, setBannerImageMobile] = useState(null);
  const [isSubmittingBanner, setIsSubmittingBanner] = useState(false);
  const [existingBanners, setExistingBanners] = useState([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);
  const [productsList, setProductsList] = useState([]);



  // ── Fetch categories for Add Product dropdown ───────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('id, name');
        if (error) throw error;
        if (data) setCategories(data);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      }
    };
    fetchCategories();
  }, []);

  // ── Fetch ALL categories for management tab ─────────────
  const fetchAllCategories = useCallback(async () => {
    setIsCatLoading(true);
    try {
      // Fetch de todas las categorías para la lista
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id')
        .order('name', { ascending: true });
      if (error) throw error;

      const allCats = data || [];
      setAllCategories(allCats);

      // Filtrar categorías raíz (parent_id es null) como clasificaciones
      const roots = allCats.filter(c => c.parent_id === null);
      setClassificationOptions(roots);

      // Seleccionar una clasificación por defecto si no está seleccionada
      if (roots.length > 0) {
        const defaultRoot = roots.find(r => r.slug === 'por-producto') || roots[0];
        setSelectedClassificationId(prev => prev || defaultRoot.id);
      }
    } catch (err) {
      console.error('[AdminDashboard] Error al cargar todas las categorías:', err);
      showError('No se pudieron cargar las categorías.');
    } finally {
      setIsCatLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchAllCategories();
    }
  }, [activeTab, fetchAllCategories]);

  // ── Payments fetch ──────────────────────────────────────
  const fetchPendingPayments = useCallback(async (filterType = paymentsFilter) => {
    setIsLoadingPayments(true);
    try {
      let query = supabase
        .from('payments')
        .select('*, orders(*, profiles(full_name, email), order_items(*, products(*)))');

      if (filterType === 'pending') {
        query = query.eq('status', 'pending_verification');
      } else {
        query = query.in('status', ['completed', 'rejected']);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Filtrar para mostrar solo pagos que sean 'contado'
      const normalPayments = (data || []).filter(payment => {
        const order = payment.orders;
        if (!order) return false;
        return order.order_type === 'contado';
      });

      setPendingPayments(normalPayments);
    } catch (error) {
      console.error('[AdminDashboard] Error cargando pagos:', error);
      showError('No se pudieron cargar los pagos.');
    } finally {
      setIsLoadingPayments(false);
    }
  }, [showError, paymentsFilter]);

  useEffect(() => {
    let timeoutId;
    if (activeTab === 'payments') {
      timeoutId = setTimeout(() => fetchPendingPayments(paymentsFilter), 0);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [activeTab, fetchPendingPayments, paymentsFilter]);

  const fetchBanners = useCallback(async () => {
    setIsLoadingBanners(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      setExistingBanners(data || []);
    } catch (err) {
      console.error('Error al cargar banners:', err);
      showError('No se pudieron cargar los banners.');
    } finally {
      setIsLoadingBanners(false);
    }
  }, [showError]);

  const fetchProductsForBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      setProductsList(data || []);
    } catch (err) {
      console.error('Error al cargar productos para el select de banners:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'banners') {
      fetchBanners();
      fetchProductsForBanners();
    }
  }, [activeTab, fetchBanners, fetchProductsForBanners]);

  // ── Product handlers ────────────────────────────────────
  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handlePortadaChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPortada(file);
      setPreviewPortada(URL.createObjectURL(file));
    }
  };

  const handleRemovePortada = () => {
    setPortada(null);
    setPreviewPortada('');
  };

  const handleGaleriaChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter(f => f.type.startsWith('image/'));

      if (galeria.length + imageFiles.length > 3) {
        showError('Límite excedido. Solo puedes agregar un máximo de 3 imágenes secundarias en la galería.');
        return;
      }

      setGaleria(prev => [...prev, ...imageFiles]);
      const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
      setPreviewGaleria(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveGaleriaItem = (index) => {
    setGaleria(prev => prev.filter((_, i) => i !== index));
    setPreviewGaleria(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productData.name || !productData.price_usd || !portada || !productData.category_id) {
      showError('Por favor completa todos los campos requeridos, incluyendo la categoría y la imagen de portada.');
      return;
    }
    setIsSubmittingProduct(true);
    try {
      // 1. Sube la imagen de portada
      const urlPortada = await uploadProductImage(portada);
      if (!urlPortada) throw new Error('Error al subir la imagen de portada.');

      // 2. Sube las imágenes de la galería en paralelo (Promise.all)
      const urlsGaleria = await Promise.all(
        galeria.map(async (file) => {
          const url = await uploadProductImage(file);
          if (!url) throw new Error(`Fallo al subir una de las imágenes de la galería: ${file.name}`);
          return url;
        })
      );

      // 3. Combina ambas partes en un único arreglo indexado
      const finalImages = [urlPortada, ...urlsGaleria];

      let parsedFeatures = {};
      try {
        if (productData.specifications && productData.specifications.trim() !== '') {
          parsedFeatures = JSON.parse(productData.specifications);
        }
      } catch {
        showError('Las características deben ser un JSON válido. Guardando como objeto vacío.');
      }

      let finalCategoryId = productData.category_id;
      if (finalCategoryId === '' || finalCategoryId === 'Seleccionar categoría') finalCategoryId = null;

      const objetoProducto = {
        category_id: finalCategoryId,
        name: productData.name.trim(),
        description: productData.description ? productData.description.trim() : null,
        price_usd: parseFloat(productData.price_usd),
        stock: parseInt(productData.stock) || 0,
        specifications: parsedFeatures,
        images_urls: finalImages
      };

      const { data: productoCreado, error: productError } = await supabase
        .from('products').insert([objetoProducto]).select('id').single();
      if (productError) throw productError;

      const stockDelFormulario = parseInt(productData.stock) || 0;
      if (stockDelFormulario > 0) {
        const { error: stockError } = await supabase.from('inventory_transactions').insert([{
          product_id: productoCreado.id,
          quantity: stockDelFormulario,
          transaction_type: 'adjustment'
        }]);
        if (stockError) throw stockError;
      }

      addProductToState({
        id: productoCreado.id,
        name: productData.name.trim(),
        description: productData.description ? productData.description.trim() : null,
        price_usd: parseFloat(productData.price_usd),
        specifications: parsedFeatures,
        images_urls: finalImages,
        image: urlPortada,
        price: parseFloat(productData.price_usd),
        salePrice: null,
        category: categories.find(c => c.id === finalCategoryId)?.name || '',
        tagline: productData.description ? productData.description.substring(0, 50) + '...' : '',
        stock: stockDelFormulario
      });

      showSuccess('Producto añadido correctamente.');
      setProductData({ category_id: '', name: '', description: '', price_usd: '', stock: '', specifications: '' });
      setPortada(null);
      setPreviewPortada('');
      setGaleria([]);
      setPreviewGaleria([]);
      e.target.reset();
    } catch (error) {
      console.error('Error exacto:', error.message, error.details);
      showError('Ocurrió un error al añadir el producto: ' + error.message);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handlePaymentAction = async (paymentId, newStatus, orderId) => {
    const actionLabel = newStatus === 'completed' ? 'VALIDAR' : 'RECHAZAR';
    if (!window.confirm(`¿Estás seguro de ${actionLabel} este pago?`)) return;
    try {
      // 1. Actualizar el pago en Supabase
      const { data: updatedPayment, error: paymentError } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId)
        .select();
      if (paymentError) throw paymentError;

      if (!updatedPayment || updatedPayment.length === 0) {
        throw new Error('No se pudo actualizar el pago en Supabase. Verifica los permisos de administrador (RLS) en la tabla payments.');
      }

      // 2. Actualizar el pedido en Supabase si aplica
      if (orderId) {
        const orderNewStatus = newStatus === 'completed' ? 'paid' : 'cancelled';
        const { data: updatedOrder, error: orderError } = await supabase
          .from('orders')
          .update({ status: orderNewStatus })
          .eq('id', orderId)
          .select();
        if (orderError) throw orderError;

        if (!updatedOrder || updatedOrder.length === 0) {
          throw new Error('El pago se actualizó, pero no se pudo actualizar el pedido (verifica los permisos RLS en la tabla orders).');
        }
      }

      // 3. Envío del correo en segundo plano (sin await) para no retrasar la interfaz de usuario
      if (newStatus === 'completed' && orderId) {
        const paymentRecord = pendingPayments.find(p => p.id === paymentId);
        const order = paymentRecord?.orders;
        const profile = order?.profiles;
        const correoCliente = profile?.email || order?.user_email;
        const nombreCliente = profile?.full_name || order?.user_name || 'Cliente';

        if (correoCliente) {
          enviarCorreoPagoVerificado(correoCliente, nombreCliente, orderId)
            .catch(emailError => {
              console.error('[AdminDashboard] Error al enviar correo de pago verificado (en segundo plano):', emailError);
            });
        } else {
          console.warn('[AdminDashboard] No se encontró email del cliente para enviar notificación de pago.');
        }
      }

      showSuccess(`Pago ${newStatus === 'completed' ? 'validado' : 'rechazado'} correctamente.`);
      // Remueve del estado local para que desaparezca con una transición limpia
      setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      showError('No se pudo actualizar el estado del pago.');
    }
  };

  // ── Category Management handlers ────────────────────────

  const handleSaveNewClassification = async () => {
    if (!newClassificationName.trim()) {
      showError('El nombre de la clasificación no puede estar vacío.');
      return;
    }
    setIsSavingClassification(true);
    try {
      const cleanName = newClassificationName.trim();
      const slug = cleanName.toLowerCase().replace(/ /g, '-');
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: cleanName,
          slug,
          parent_id: null
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setClassificationOptions(prev => [...prev, data]);
      setAllCategories(prev => [...prev, data]);
      setCategories(prev => [...prev, data]);
      setSelectedClassificationId(data.id);
      
      showSuccess(`Clasificación "${cleanName}" creada correctamente.`);
      setIsCreatingClassification(false);
      setNewClassificationName('');
    } catch (err) {
      console.error('Error al crear clasificación:', err);
      showError('No se pudo crear la clasificación. Verifica que el nombre sea único.');
    } finally {
      setIsSavingClassification(false);
    }
  };

  const handleDeleteClassification = async (classification) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la clasificación "${classification.name}"? Las subcategorías pertenecientes a esta clasificación quedarán sin clasificación asignada.`)) {
      return;
    }
    try {
      const { data: deletedRows, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', classification.id)
        .select();

      if (error) throw error;

      if (!deletedRows || deletedRows.length === 0) {
        showError('No se pudo eliminar: sin permisos en la base de datos o la fila no existe.');
        return; 
      }

      setAllCategories(prev => prev.filter(c => c.id !== classification.id));
      setCategories(prev => prev.filter(c => c.id !== classification.id));
      setClassificationOptions(prev => prev.filter(c => c.id !== classification.id));

      if (selectedClassificationId === classification.id) {
        const remaining = classificationOptions.filter(c => c.id !== classification.id);
        if (remaining.length > 0) {
          const defaultRoot = remaining.find(r => r.slug === 'por-producto') || remaining[0];
          setSelectedClassificationId(defaultRoot.id);
        } else {
          setSelectedClassificationId(null);
        }
      }

      showSuccess(`Clasificación "${classification.name}" eliminada correctamente.`);
    } catch (err) {
      console.error('Error al eliminar clasificación:', err);
      showError('No se pudo eliminar la clasificación.');
    }
  };

  const startEditCategory = (cat) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setSelectedClassificationId(cat.parent_id);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setNewCatName('');
    if (classificationOptions.length > 0) {
      const defaultRoot = classificationOptions.find(r => r.slug === 'por-producto') || classificationOptions[0];
      setSelectedClassificationId(defaultRoot.id);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showError('El nombre de la categoría es requerido.');
      return;
    }
    setIsSavingCat(true);
    try {
      const cleanName = newCatName.trim();
      const slug = cleanName.toLowerCase().replace(/ /g, '-');
      const parentId = editingCategory.parent_id === null ? null : selectedClassificationId;
      
      const { error } = await supabase
        .from('categories')
        .update({
          name: cleanName,
          slug,
          parent_id: parentId
        })
        .eq('id', editingCategory.id);
        
      if (error) throw error;
      
      setAllCategories(prev =>
        prev.map(c => c.id === editingCategory.id
          ? { ...c, name: cleanName, slug, parent_id: parentId }
          : c
        )
      );
      setCategories(prev =>
        prev.map(c => c.id === editingCategory.id
          ? { ...c, name: cleanName, slug, parent_id: parentId }
          : c
        )
      );
      
      if (editingCategory.parent_id === null) {
        setClassificationOptions(prev =>
          prev.map(c => c.id === editingCategory.id
            ? { ...c, name: cleanName, slug }
            : c
          )
        );
      }
      
      showSuccess(`Categoría "${cleanName}" actualizada correctamente.`);
      cancelEditCategory();
    } catch (err) {
      console.error('Error al actualizar categoría:', err);
      showError('No se pudo actualizar la categoría.');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showError('El nombre de la categoría es requerido.');
      return;
    }
    setIsAddingCat(true);
    try {
      const cleanName = newCatName.trim();
      const slug = cleanName.toLowerCase().replace(/ /g, '-');
      const parentId = selectedClassificationId;
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: cleanName,
          slug,
          parent_id: parentId
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setAllCategories(prev => [...prev, data]);
      setCategories(prev => [...prev, data]);
      
      const parentName = classificationOptions.find(c => c.id === parentId)?.name || 'la clasificación seleccionada';
      showSuccess(`Categoría "${data.name}" creada en "${parentName}" correctamente.`);
      setNewCatName('');
    } catch (err) {
      console.error('Error creando categoría:', err);
      showError('No se pudo crear la categoría. Verifica que el nombre sea único.');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const categoryId = cat.id;

    if (!window.confirm(
      '¿Estás seguro de que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría asignada.'
    )) return;

    try {
      const { data: deletedRows, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .select();

      if (error) throw error;

      if (!deletedRows || deletedRows.length === 0) {
        showError('No se pudo eliminar: sin permisos en la base de datos o la fila no existe.');
        return; 
      }

      setAllCategories(prev => prev.filter(c => c.id !== categoryId));
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      setClassificationOptions(prev => prev.filter(c => c.id !== categoryId));

      showSuccess(`Categoría "${cat.name}" eliminada correctamente.`);
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      showError('No se pudo eliminar la categoría. Revisa la consola.');
    }
  };


  // ── Banner Management handlers ──────────────────────────
  const handleBannerInputChange = (e) => {
    const { name, value } = e.target;
    setBannerData(prev => ({
      ...prev,
      [name]: name === 'order_index' ? parseInt(value) || 0 : value
    }));
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!bannerImagePc || !bannerImageMobile) {
      showError('Por favor selecciona tanto la imagen para PC como la imagen para móvil.');
      return;
    }

    setIsSubmittingBanner(true);
    try {
      // 1. Subir imagen de PC
      const fileExtPc = bannerImagePc.name.split('.').pop();
      const fileNamePc = `${Date.now()}-pc-${Math.random().toString(36).substring(2)}.${fileExtPc}`;
      const filePathPc = `banners/${fileNamePc}`;

      const { error: uploadErrorPc } = await supabase.storage
        .from('hero-banners')
        .upload(filePathPc, bannerImagePc);

      if (uploadErrorPc) {
        throw new Error(`Error al subir la imagen de PC al Storage: ${uploadErrorPc.message}`);
      }

      const { data: publicUrlDataPc } = supabase.storage
        .from('hero-banners')
        .getPublicUrl(filePathPc);

      const publicUrlPc = publicUrlDataPc?.publicUrl;
      if (!publicUrlPc) {
        throw new Error('No se pudo recuperar la URL pública del banner de PC.');
      }

      // 2. Subir imagen Móvil
      const fileExtMobile = bannerImageMobile.name.split('.').pop();
      const fileNameMobile = `${Date.now()}-mobile-${Math.random().toString(36).substring(2)}.${fileExtMobile}`;
      const filePathMobile = `banners/${fileNameMobile}`;

      const { error: uploadErrorMobile } = await supabase.storage
        .from('hero-banners')
        .upload(filePathMobile, bannerImageMobile);

      if (uploadErrorMobile) {
        throw new Error(`Error al subir la imagen móvil al Storage: ${uploadErrorMobile.message}`);
      }

      const { data: publicUrlDataMobile } = supabase.storage
        .from('hero-banners')
        .getPublicUrl(filePathMobile);

      const publicUrlMobile = publicUrlDataMobile?.publicUrl;
      if (!publicUrlMobile) {
        throw new Error('No se pudo recuperar la URL pública del banner móvil.');
      }

      // 3. Guardar en Base de Datos
      const { error: insertError } = await supabase
        .from('banners')
        .insert([{
          title: bannerData.title,
          subtitle: bannerData.subtitle,
          image_url: publicUrlPc,
          image_url_mobile: publicUrlMobile,
          link_url: bannerData.link_url || '/tienda',
          redirect_url: bannerData.redirect_url.trim() || '/tienda',
          product_id: bannerData.product_id || null,
          order_index: bannerData.order_index
        }]);

      if (insertError) {
        throw insertError;
      }

      showSuccess('¡Banner añadido exitosamente, uhhh uhhh!');
      
      setBannerData({
        title: '',
        subtitle: '',
        link_url: '/tienda',
        redirect_url: '',
        product_id: '',
        order_index: 0
      });
      setBannerImagePc(null);
      setBannerImageMobile(null);
      if (e.target) e.target.reset();

      fetchBanners();
    } catch (err) {
      console.error('[AdminDashboard] Error al crear banner:', err);
      showError(`Error al crear el banner: ${err.message || err}`);
    } finally {
      setIsSubmittingBanner(false);
    }
  };

  const handleDeleteBanner = async (banner) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este banner, uhhh ahhh?')) return;
    try {
      // Eliminar imagen de PC
      if (banner.image_url) {
        try {
          const urlParts = banner.image_url.split('/storage/v1/object/public/hero-banners/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('hero-banners').remove([filePath]);
          }
        } catch (err) {
          console.warn('No se pudo borrar el archivo de PC del storage:', err);
        }
      }

      // Eliminar imagen móvil
      if (banner.image_url_mobile) {
        try {
          const urlParts = banner.image_url_mobile.split('/storage/v1/object/public/hero-banners/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('hero-banners').remove([filePath]);
          }
        } catch (err) {
          console.warn('No se pudo borrar el archivo móvil del storage:', err);
        }
      }

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;
      showSuccess('Banner eliminado correctamente, u u a a.');
      fetchBanners();
    } catch (err) {
      console.error('Error al eliminar banner:', err);
      showError('No se pudo eliminar el banner.');
    }
  };

  const filteredPayments = pendingPayments.filter(payment => {
    if (!paymentsSearchTerm) return true;
    const term = paymentsSearchTerm.toLowerCase();
    const order = payment.orders;
    const orderId = order?.id ? String(order.id).toLowerCase() : '';
    const shortId = order?.id ? String(order.id).slice(-6).toLowerCase() : '';
    const clientName = (order?.profiles?.full_name || order?.user_name || '').toLowerCase();
    const clientEmail = (order?.profiles?.email || order?.user_email || '').toLowerCase();
    const reference = (payment.reference_number || '').toLowerCase();

    return orderId.includes(term) || 
           shortId.includes(term) || 
           clientName.includes(term) || 
           clientEmail.includes(term) || 
           reference.includes(term);
  });

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="admin-dashboard-panel animate-fade-in">
      <div className="admin-dashboard-header">
        <h1 className="admin-panel-title">SRX Control Panel</h1>
        <p className="admin-panel-subtitle">Gestión centralizada de operaciones</p>
      </div>



      <div className="admin-dashboard-content">

        {/* ══ TAB: Add Product ══════════════════════════════ */}
        {activeTab === 'addProduct' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Nuevo Producto</h2>
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Título del Producto</label>
                <input
                  type="text" name="name" value={productData.name}
                  onChange={handleProductInputChange}
                  placeholder="Ej: Sony A7S III" required
                />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select
                  name="category_id" value={productData.category_id}
                  onChange={handleProductInputChange} required
                >
                  <option value="" disabled>Selecciona una categoría...</option>
                  {categories && categories.length > 0 && categories.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>{categoria.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  name="description" value={productData.description}
                  onChange={handleProductInputChange}
                  placeholder="Descripción detallada del producto..." rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio (USD)</label>
                  <input
                     type="number" step="0.01" name="price_usd"
                     value={productData.price_usd}
                     onChange={handleProductInputChange}
                     placeholder="Ej: 3499.99" required
                  />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number" name="stock" value={productData.stock}
                    onChange={handleProductInputChange} placeholder="Ej: 15"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Características (JSON)</label>
                <textarea
                  name="specifications" value={productData.specifications}
                  onChange={handleProductInputChange}
                  placeholder='{"Resolución": "4K", "Sensor": "Full Frame"}'
                  rows={3} className="font-mono"
                />
              </div>

              {/* Imagen de Portada y Galería (Contenedor Responsivo en Grilla) */}
              <div className="image-upload-grid">
                {/* Columna 1: Portada (Obligatoria) */}
                <div className="upload-column">
                  <span className="upload-label">Imagen de Portada (Obligatoria)</span>
                  <div className="image-box-wrapper">
                    {previewPortada ? (
                      <div className="image-preview-container">
                        <img
                          src={previewPortada}
                          alt="Previsualización Portada"
                          className="image-preview-img"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePortada}
                          className="btn-remove-image"
                          title="Eliminar portada"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          id="portadaInput"
                          accept="image/*"
                          multiple={false}
                          onChange={handlePortadaChange}
                          className="file-input-hidden"
                        />
                        <label
                          htmlFor="portadaInput"
                          className="image-box-clickable"
                        >
                          <UploadCloud size={32} className="upload-icon" />
                          <span className="upload-text">
                            Seleccionar Portada
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Columna 2 y 3: Galería (Opcional, hasta 3) */}
                <div className="upload-column">
                  <span className="upload-label">Galería de Imágenes (Opcional, hasta 3)</span>
                  <div className="gallery-grid">
                    {/* Previews de la Galería */}
                    {previewGaleria.map((preview, index) => (
                      <div key={index} className="gallery-slot">
                        <div className="image-preview-container">
                          <img
                            src={preview}
                            alt={`Galería preview ${index + 1}`}
                            className="image-preview-img"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGaleriaItem(index)}
                            className="btn-remove-image"
                            title="Eliminar imagen"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Botón para añadir imágenes (si no se ha alcanzado el límite de 3) */}
                    {galeria.length < 3 && (
                      <div className="gallery-slot">
                        <div className="image-box-wrapper" style={{ height: '100%' }}>
                          <input
                            type="file"
                            id="galeriaInput"
                            accept="image/*"
                            multiple
                            onChange={handleGaleriaChange}
                            className="file-input-hidden"
                          />
                          <label
                            htmlFor="galeriaInput"
                            className="image-box-clickable"
                          >
                            <PlusCircle size={28} className="upload-icon" />
                            <span className="upload-text" style={{ fontSize: '0.75rem' }}>
                              Añadir Imagen
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Relleno para mantener la grilla estructurada de 3 columnas */}
                    {Array.from({ length: 3 - galeria.length - (galeria.length < 3 ? 1 : 0) }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="gallery-slot gallery-slot-empty">
                        <span>Vacío</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="admin-submit-btn" disabled={isSubmittingProduct || !portada}>
                {isSubmittingProduct
                  ? <><Loader2 size={18} className="spin" /> Guardando...</>
                  : <><PackagePlus size={18} /> Añadir Producto al Catálogo</>
                }
              </button>
            </form>
          </div>
        )}

        {/* ══ TAB: Payments ════════════════════════════════ */}
        {activeTab === 'payments' && (
          <div className="admin-section">
              <div className="admin-payments-header-row">
                <h2 className="admin-section-title">
                  {paymentsFilter === 'pending' ? 'Pedidos al Contado Pendientes' : 'Historial de Pedidos al Contado'}
                </h2>
                
                <div className="payments-subtabs">
                  <button
                    type="button"
                    className={`subtab-btn ${paymentsFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setPaymentsFilter('pending')}
                  >
                    Pendientes de Validación {paymentsFilter === 'pending' ? `(${pendingPayments.length})` : ''}
                  </button>
                  <button
                    type="button"
                    className={`subtab-btn ${paymentsFilter === 'history' ? 'active' : ''}`}
                    onClick={() => setPaymentsFilter('history')}
                  >
                    Historial de Pedidos
                  </button>
                </div>
              </div>

              {/* Barra de búsqueda de pagos */}
              <div className="admin-toolbar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="admin-search-box" style={{ display: 'flex', alignItems: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 1rem', width: '100%', maxWidth: '350px' }}>
                  <Search size={18} style={{ color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Buscar por Pedido ID, cliente o referencia..."
                    value={paymentsSearchTerm}
                    onChange={(e) => setPaymentsSearchTerm(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: '0.5rem', width: '100%', color: '#f1f5f9' }}
                  />
                </div>
              </div>

              {isLoadingPayments ? (
                <div className="admin-loading-state">
                  <Loader2 size={32} className="spin" />
                  <p>{paymentsFilter === 'pending' ? 'Cargando pedidos al contado pendientes...' : 'Cargando historial de pedidos al contado...'}</p>
                </div>
              ) : pendingPayments.length === 0 ? (
                <div className="admin-empty-state">
                  <CheckCircle size={48} className="empty-icon text-green" />
                  <p>
                    {paymentsFilter === 'pending' 
                      ? '¡Todo al día! No hay pedidos al contado pendientes por verificar.' 
                      : 'No hay registros en el historial de pedidos al contado.'}
                  </p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="admin-empty-state">
                  <Search size={48} className="empty-icon text-slate-400" style={{ color: '#64748b' }} />
                  <p>No se encontraron pedidos que coincidan con la búsqueda.</p>
                </div>
              ) : (
                <div className="payments-grid">
                  <AnimatePresence mode="popLayout">
                    {filteredPayments.map(payment => {
                      const order = payment.orders;
                      const profile = order?.profiles;
                      return (
                        <motion.div 
                          key={payment.id} 
                          className="payment-card"
                          initial={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, y: 20 }}
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          layout
                        >
                          <div className="payment-card-header">
                            <span className="payment-id">
                              Pedido #{order?.id ? String(order.id).slice(-6).toUpperCase() : 'N/A'}
                            </span>
                            <span className="payment-amount">
                              {payment.currency === 'USD' ? '$' : payment.currency === 'EUR' ? '€' : ''}
                              {Number(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {' '}<span className="payment-currency">{payment.currency || 'USD'}</span>
                            </span>
                          </div>

                          <div className="payment-details">
                            <p><strong>Cliente:</strong> {profile?.full_name || order?.user_name || 'Sin nombre'}</p>
                            <p><strong>Email:</strong> {profile?.email || order?.user_email || 'N/A'}</p>
                            <p><strong>Fecha:</strong> {new Date(payment.created_at).toLocaleString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                            {payment.reference_number && (
                              <p><strong>Nº Referencia:</strong> <span className="reference-badge">{payment.reference_number}</span></p>
                            )}
                          </div>

                          {/* LISTA DE PRODUCTOS COMPRADOS */}
                          {order?.order_items && order.order_items.length > 0 && (
                            <div className="payment-products-list">
                              <h4 className="payment-products-title">Productos en Pedido:</h4>
                              {order.order_items.map(item => {
                                const product = item.products;
                                const mainImage = product?.images_urls?.[0] || 'https://via.placeholder.com/80';
                                return (
                                  <div key={item.id} className="payment-product-item">
                                    <img src={mainImage} alt={product?.name} className="payment-product-img" />
                                    <div className="payment-product-details">
                                      <p className="payment-product-name" title={product?.name}>
                                        {product?.name || 'Producto Desconocido'}
                                      </p>
                                      <span className="payment-product-qty-price">
                                        Cant: {item.quantity} × ${Number(item.price_at_purchase_usd || product?.price_usd || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="payment-proof">
                            {payment.proof_image_url ? (
                              <div className="proof-image-container">
                                <img
                                  src={payment.proof_image_url}
                                  alt="Comprobante de pago"
                                  className="proof-image"
                                  onClick={() => window.open(payment.proof_image_url, '_blank')}
                                  style={{ cursor: 'zoom-in' }}
                                />
                                <a href={payment.proof_image_url} target="_blank" rel="noopener noreferrer" className="view-full-btn">
                                  <Search size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Ver comprobante completo
                                </a>
                              </div>
                            ) : (
                              <div className="no-proof">
                                <ImageIcon size={24} />
                                <span>Sin imagen de comprobante</span>
                              </div>
                            )}
                          </div>

                          {paymentsFilter === 'history' ? (
                            <div className="payment-status-badge-container">
                              <span className={`payment-status-badge ${payment.status}`}>
                                {payment.status === 'completed' ? 'Pago Aceptado' : 'Pago Rechazado'}
                              </span>
                            </div>
                          ) : (
                            <div className="payment-actions">
                              <button
                                className="btn-reject"
                                onClick={() => handlePaymentAction(payment.id, 'rejected', order?.id)}
                              >
                                <XCircle size={18} /> Rechazar
                              </button>
                              <button
                                className="btn-approve"
                                onClick={() => handlePaymentAction(payment.id, 'completed', order?.id)}
                              >
                                <CheckCircle size={18} /> Validar Pago
                              </button>
                            </div>
                          )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: Manage Categories ═══════════════════════ */}
        {activeTab === 'categories' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Gestionar Categorías</h2>

            {/* ── Add new category form ── */}
            {/* ── Add/Edit category form ── */}
            <form className="cat-add-form" onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}>
              <h3 className="cat-add-title">
                {editingCategory ? <Pencil size={18} /> : <PlusCircle size={18} />}
                {editingCategory ? `Editar Categoría: ${editingCategory.name}` : 'Nueva Categoría'}
              </h3>
              <div className="cat-add-fields">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Ej: Cámaras, Lentes, Iluminación..."
                    required
                  />
                </div>

                {/* ── Botonera de grupo ── */}
                {(!editingCategory || editingCategory.parent_id !== null) && (
                  <div className="form-group">
                    <label>Clasificar en</label>
                    <div className="category-group-selector" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {classificationOptions.map(option => (
                        <div key={option.id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            className={`selector-btn ${selectedClassificationId === option.id ? 'active' : ''}`}
                            onClick={() => setSelectedClassificationId(option.id)}
                            style={{
                              paddingRight: option.slug !== 'por-producto' && option.slug !== 'para-tu-equipo' ? '2.2rem' : '1.25rem'
                            }}
                          >
                            {option.name}
                          </button>
                          {option.slug !== 'por-producto' && option.slug !== 'para-tu-equipo' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClassification(option);
                              }}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: selectedClassificationId === option.id ? '#ffffff' : '#f87171',
                                opacity: 0.7,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                                zIndex: 10
                              }}
                              title={`Eliminar clasificación "${option.name}"`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Botón/Input para añadir nueva clasificación */}
                    <div style={{ marginTop: '0.75rem' }}>
                      {!isCreatingClassification ? (
                        <button
                          type="button"
                          className="selector-btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px dashed rgba(255, 255, 255, 0.2)',
                            color: '#cbd5e1',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            width: 'auto',
                            cursor: 'pointer',
                          }}
                          onClick={() => setIsCreatingClassification(true)}
                        >
                          <PlusCircle size={14} />
                          Añadir nueva clasificación
                        </button>
                      ) : (
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          padding: '0.5rem',
                          borderRadius: '10px',
                          maxWidth: '400px'
                        }}>
                          <input
                            type="text"
                            value={newClassificationName}
                            onChange={(e) => setNewClassificationName(e.target.value)}
                            placeholder="Ej: Repuestos, Para Creadores"
                            style={{
                              flex: 1,
                              background: '#1e293b',
                              border: '1px solid #334155',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              color: '#f1f5f9',
                              fontSize: '0.85rem',
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleSaveNewClassification}
                            disabled={isSavingClassification}
                            style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            {isSavingClassification ? '...' : 'Guardar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingClassification(false);
                              setNewClassificationName('');
                            }}
                            style={{
                              background: 'transparent',
                              color: '#94a3b8',
                              border: 'none',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="admin-submit-btn cat-add-btn" disabled={editingCategory ? isSavingCat : isAddingCat}>
                  {editingCategory ? (
                    isSavingCat ? <><Loader2 size={16} className="spin" /> Guardando...</> : <><Check size={16} /> Actualizar Categoría</>
                  ) : (
                    isAddingCat ? <><Loader2 size={16} className="spin" /> Creando...</> : <><PlusCircle size={16} /> Crear Categoría</>
                  )}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    className="admin-submit-btn cat-add-btn"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    onClick={cancelEditCategory}
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>

            {/* ── Categories list ── */}
            {isCatLoading ? (
              <div className="admin-loading-state">
                <Loader2 size={32} className="spin" />
                <p>Cargando categorías...</p>
              </div>
            ) : allCategories.length === 0 ? (
              <div className="admin-empty-state">
                <Layers size={48} style={{ color: '#64748b' }} />
                <p>No hay categorías creadas aún.</p>
              </div>
            ) : (
              <div className="cat-list">
                {allCategories.map(cat => (
                  <div
                    key={cat.id}
                    className="cat-row"
                  >
                    {/* ── Name and Classification Badge ── */}
                    <div className="cat-row-body">
                      <div className="cat-row-info">
                        <span className="cat-row-name">{cat.name}</span>
                        <span className="cat-hidden-badge" style={{
                          background: cat.parent_id ? 'rgba(96, 165, 250, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                          color: cat.parent_id ? '#60a5fa' : '#c084fc',
                          borderColor: cat.parent_id ? 'rgba(96, 165, 250, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                          borderStyle: 'solid',
                          borderWidth: '1px',
                          display: 'inline-block',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          borderRadius: '4px',
                          padding: '0.1rem 0.45rem',
                          marginLeft: '0.5rem'
                        }}>
                          {cat.parent_id
                            ? `Clasificación: ${allCategories.find(c => c.id === cat.parent_id)?.name || 'Desconocido'}`
                            : 'Clasificación Principal'
                          }
                        </span>
                      </div>
                    </div>

                    {/* ── Actions ── */}
                    <div className="cat-row-actions">
                      <button
                        className="cat-action-btn cat-action-btn--edit"
                        onClick={() => startEditCategory(cat)}
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        className="cat-action-btn cat-action-btn--delete"
                        onClick={() => handleDeleteCategory(cat)}
                        title="Eliminar categoría"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}



        {/* ══ TAB: Banners ══════════════════════════════════ */}
        {activeTab === 'banners' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Gestión de Banners (Hero)</h2>
            <form className="admin-form" onSubmit={handleAddBanner}>
              <div className="form-group">
                <label>Título del Banner</label>
                <input
                  type="text"
                  name="title"
                  value={bannerData.title}
                  onChange={handleBannerInputChange}
                  placeholder="Ej: DJI Osmo Pocket 3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Subtítulo / Descripción</label>
                <input
                  type="text"
                  name="subtitle"
                  value={bannerData.subtitle}
                  onChange={handleBannerInputChange}
                  placeholder="Ej: Captura tus mejores momentos"
                  required
                />
              </div>

              <div className="form-group">
                <label>Enlace de redirección (URL)</label>
                <input
                  type="text"
                  name="redirect_url"
                  value={bannerData.redirect_url}
                  onChange={handleBannerInputChange}
                  placeholder="Ej: /tienda, https://google.com, o enlace de producto (dejar vacío para /tienda)"
                />
              </div>

              <div className="form-group">
                <label>Vincular a Producto (Opcional)</label>
                <select
                  name="product_id"
                  value={bannerData.product_id || ''}
                  onChange={handleBannerInputChange}
                >
                  <option value="">-- No vincular a ningún producto (Banner General) --</option>
                  {productsList.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name}
                    </option>
                  ))}
                </select>
                <span className="file-upload-tip" style={{ marginTop: '0.25rem', display: 'block' }}>
                  Si seleccionas un producto, al hacer clic en el banner se abrirá el modal de detalle del producto automáticamente sin cambiar de página.
                </span>
              </div>



              <div className="form-group">
                <label>Imagen para PC (Escritorio)</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="bannerImagePc"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBannerImagePc(e.target.files[0]);
                      }
                    }}
                    className="file-input-hidden"
                  />
                  <label htmlFor="bannerImagePc" className="file-upload-box">
                    <UploadCloud size={32} className="upload-icon" />
                    <span className="upload-text">
                      {bannerImagePc ? bannerImagePc.name : 'Haz clic para seleccionar imagen de PC'}
                    </span>
                    <span className="file-upload-tip">
                      Nota: Para un mejor rendimiento y carga rápida de la página, se recomienda subir la imagen en formatos ligeros (.webp / .jpg) optimizados para pantallas anchas.
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Imagen para Móvil (Teléfonos)</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="bannerImageMobile"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBannerImageMobile(e.target.files[0]);
                      }
                    }}
                    className="file-input-hidden"
                  />
                  <label htmlFor="bannerImageMobile" className="file-upload-box">
                    <UploadCloud size={32} className="upload-icon" />
                    <span className="upload-text">
                      {bannerImageMobile ? bannerImageMobile.name : 'Haz clic para seleccionar imagen móvil'}
                    </span>
                    <span className="file-upload-tip">
                      Nota: Para un mejor rendimiento y carga rápida de la página, se recomienda subir la imagen en formatos ligeros (.webp / .jpg), recomendando un diseño vertical o cuadrado para mejor adaptabilidad móvil.
                    </span>
                  </label>
                </div>
              </div>

              <button type="submit" className="admin-submit-btn" disabled={isSubmittingBanner}>
                {isSubmittingBanner ? (
                  <><Loader2 size={18} className="spin" /> Subiendo y guardando banner...</>
                ) : (
                  <><ImageIcon size={18} /> Guardar Banner</>
                )}
              </button>
            </form>

            {/* Listado de Banners Existentes */}
            <div className="existing-banners-section" style={{ marginTop: '3rem' }}>
              <h3 className="admin-section-title" style={{ fontSize: '1.25rem' }}>Banners Actuales</h3>
              {isLoadingBanners ? (
                <div className="admin-loading-state">
                  <Loader2 size={32} className="spin" />
                  <p>Cargando banners...</p>
                </div>
              ) : existingBanners.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>No hay banners configurados en la base de datos.</p>
              ) : (
                <div className="banners-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                  {existingBanners.map(banner => (
                    <div key={banner.id} className="banner-admin-card" style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>PC</span>
                          <img src={banner.image_url} alt={`${banner.title} PC`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Móvil</span>
                          <img src={banner.image_url_mobile || banner.image_url} alt={`${banner.title} Móvil`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary, #f8fafc)' }}>{banner.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', margin: '0.25rem 0' }}>{banner.subtitle}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                          <span>
                            {banner.product_id ? (
                              `Vínculo a Producto: ${productsList.find(p => p.id === banner.product_id)?.name || 'Cargando...'}`
                            ) : (
                              `Enlace: ${banner.redirect_url || banner.link_url || '/tienda'}`
                            )}
                          </span>
                          <span>Orden: {banner.order_index}</span>
                        </div>
                      </div>
                      <button
                        className="btn-reject"
                        onClick={() => handleDeleteBanner(banner)}
                        style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px' }}
                      >
                        <XCircle size={16} /> Eliminar Banner
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
