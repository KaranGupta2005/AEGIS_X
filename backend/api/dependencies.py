_processor = None


def get_processor():
    global _processor
    if _processor is None:
        from backend.services.event_processor import EventProcessor
        _processor = EventProcessor()
    return _processor


def set_processor(processor):
    global _processor
    _processor = processor
